import React, { useState, useCallback } from 'react';
import { apiClient } from '../lib/api-production';

interface UploadState {
  stage: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  assetId?: string;
  watermarkedUrl?: string;
  error?: string;
}

const ProductionUploader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    stage: 'idle',
    progress: 0,
    message: 'Select an image to get started'
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadState({
        stage: 'error',
        progress: 0,
        message: 'Please select an image file',
        error: 'Invalid file type'
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadState({
        stage: 'error',
        progress: 0,
        message: 'File size must be less than 10MB',
        error: 'File too large'
      });
      return;
    }

    setSelectedFile(file);
    setUploadState({
      stage: 'idle',
      progress: 0,
      message: `Ready to upload: ${file.name}`
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploadState({
      stage: 'uploading',
      progress: 0,
      message: 'Starting upload...'
    });

    try {
      const result = await apiClient.uploadAndProcess(
        selectedFile,
        (stage, progress) => {
          setUploadState(prev => ({
            ...prev,
            stage: progress < 100 ? 'uploading' : 'completed',
            progress,
            message: stage
          }));
        }
      );

      setUploadState({
        stage: 'completed',
        progress: 100,
        message: 'Upload and watermarking completed successfully!',
        assetId: result.assetId,
        watermarkedUrl: result.watermarkedUrl
      });

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadState({
        stage: 'error',
        progress: 0,
        message: 'Upload failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [selectedFile]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setUploadState({
      stage: 'idle',
      progress: 0,
      message: 'Select an image to get started'
    });
  }, []);

  const handleDownload = useCallback(() => {
    if (uploadState.watermarkedUrl) {
      // Create download link
      const link = document.createElement('a');
      link.href = uploadState.watermarkedUrl;
      link.download = `watermarked-${selectedFile?.name || 'image'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [uploadState.watermarkedUrl, selectedFile?.name]);

  const getProgressColor = () => {
    switch (uploadState.stage) {
      case 'error': return 'bg-red-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  const getStageIcon = () => {
    switch (uploadState.stage) {
      case 'uploading':
      case 'processing':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        );
      case 'completed':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Hatchmark Digital Watermarking
        </h2>
        <p className="text-gray-600">
          Upload your digital artwork to apply an invisible authenticity watermark
        </p>
      </div>

      {/* File Upload Area */}
      <div className="mb-6">
        <label 
          htmlFor="file-upload" 
          className={`relative block w-full border-2 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors ${
            uploadState.stage === 'error' ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <div className="flex flex-col items-center">
            {getStageIcon()}
            <span className="mt-2 block text-sm font-medium text-gray-900">
              {selectedFile ? selectedFile.name : 'Select an image file'}
            </span>
            <span className="mt-1 block text-xs text-gray-500">
              PNG, JPG, GIF up to 10MB
            </span>
          </div>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileSelect}
            disabled={uploadState.stage === 'uploading' || uploadState.stage === 'processing'}
          />
        </label>
      </div>

      {/* Progress Bar */}
      {uploadState.progress > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{uploadState.message}</span>
            <span>{Math.round(uploadState.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${uploadState.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Status Message */}
      <div className="mb-6 text-center">
        <p className={`text-sm ${
          uploadState.stage === 'error' ? 'text-red-600' : 
          uploadState.stage === 'completed' ? 'text-green-600' : 
          'text-gray-600'
        }`}>
          {uploadState.message}
        </p>
        {uploadState.error && (
          <p className="text-xs text-red-500 mt-1">
            Error: {uploadState.error}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        {uploadState.stage === 'idle' && selectedFile && (
          <button
            onClick={handleUpload}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Upload & Watermark
          </button>
        )}

        {uploadState.stage === 'completed' && (
          <>
            <button
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Download Watermarked Image
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Upload Another
            </button>
          </>
        )}

        {uploadState.stage === 'error' && (
          <button
            onClick={handleReset}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Try Again
          </button>
        )}
      </div>

      {/* Asset ID Display */}
      {uploadState.assetId && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Asset Information</h3>
          <div className="text-xs text-gray-600">
            <p><strong>Asset ID:</strong> {uploadState.assetId}</p>
            <p className="mt-1 text-gray-500">
              Save this ID to verify your artwork's authenticity later
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionUploader;
