'use client'

import React, { useState } from 'react'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
  objectKey?: string
  watermarkedUrl?: string
}

export function Uploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUploadStatus({
          status: 'error',
          progress: 0,
          message: 'Please select an image file'
        })
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadStatus({
          status: 'error',
          progress: 0,
          message: 'File size must be less than 10MB'
        })
        return
      }

      setSelectedFile(file)
      setUploadStatus({
        status: 'idle',
        progress: 0,
        message: ''
      })
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: 'Please select a file first'
      })
      return
    }

    try {
      setUploadStatus({
        status: 'uploading',
        progress: 0,
        message: 'Getting upload URL...'
      })

      // Step 1: Get presigned upload URL
      const { uploadUrl, objectKey } = await apiClient.initiateUpload({
        filename: selectedFile.name
      })

      setUploadStatus(prev => ({
        ...prev,
        message: 'Uploading file...',
        objectKey
      }))

      // Step 2: Upload file directly to S3
      await apiClient.uploadFileToS3(
        uploadUrl,
        selectedFile,
        (progress) => {
          setUploadStatus(prev => ({
            ...prev,
            progress
          }))
        }
      )

      setUploadStatus({
        status: 'processing',
        progress: 100,
        message: 'File uploaded successfully! Processing watermark...',
        objectKey
      })

      // Step 3: Poll for processing status
      pollProcessingStatus(objectKey)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Upload failed'
      })
    }
  }

  const pollProcessingStatus = async (objectKey: string) => {
    const maxAttempts = 60 // Poll for up to 5 minutes
    let attempts = 0

    const poll = async () => {
      try {
        attempts++
        const statusResponse = await apiClient.checkProcessingStatus(objectKey)
        
        if (statusResponse.status === 'COMPLETED') {
          setUploadStatus({
            status: 'completed',
            progress: 100,
            message: 'Watermarking completed successfully!',
            objectKey,
            watermarkedUrl: statusResponse.watermarkedUrl
          })
          return
        }

        if (statusResponse.status === 'FAILED') {
          setUploadStatus({
            status: 'error',
            progress: 0,
            message: 'Watermarking failed. Please try again.'
          })
          return
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else {
          setUploadStatus({
            status: 'error',
            progress: 0,
            message: 'Processing timeout. Please check back later.'
          })
        }
      } catch (error) {
        console.error('Status polling error:', error)
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000)
        } else {
          setUploadStatus({
            status: 'error',
            progress: 0,
            message: 'Unable to check processing status'
          })
        }
      }
    }

    poll()
  }

  const reset = () => {
    setSelectedFile(null)
    setUploadStatus({
      status: 'idle',
      progress: 0,
      message: ''
    })
  }

  const getStatusIcon = () => {
    switch (uploadStatus.status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Upload className="h-4 w-4" />
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload & Watermark
        </CardTitle>
        <CardDescription>
          Upload an image to protect it with an invisible watermark
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'}
          />
          {selectedFile && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {uploadStatus.status !== 'idle' && (
          <div className="space-y-2">
            {(uploadStatus.status === 'uploading' || uploadStatus.status === 'processing') && (
              <Progress value={uploadStatus.progress} className="w-full" />
            )}
            
            <Alert className={
              uploadStatus.status === 'error' ? 'border-red-200 bg-red-50' :
              uploadStatus.status === 'completed' ? 'border-green-200 bg-green-50' :
              'border-blue-200 bg-blue-50'
            }>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <AlertDescription>{uploadStatus.message}</AlertDescription>
              </div>
            </Alert>

            {uploadStatus.status === 'completed' && uploadStatus.watermarkedUrl && (
              <div className="pt-2">
                <Button
                  onClick={() => window.open(uploadStatus.watermarkedUrl, '_blank')}
                  variant="outline"
                  className="w-full"
                >
                  View Watermarked Image
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'}
            className="flex-1"
          >
            {uploadStatus.status === 'uploading' || uploadStatus.status === 'processing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadStatus.status === 'uploading' ? 'Uploading...' : 'Processing...'}
              </>
            ) : (
              'Upload & Watermark'
            )}
          </Button>

          {(uploadStatus.status === 'completed' || uploadStatus.status === 'error') && (
            <Button onClick={reset} variant="outline">
              Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
