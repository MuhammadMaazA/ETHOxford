// Production API Client for Hatchmark Frontend
// This is the complete API client that works with the AWS SAM backend

interface InitiateUploadResponse {
  uploadUrl: string;
  objectKey: string;
  assetId: string;
}

interface InitiateUploadRequest {
  filename: string;
}

interface VerificationResponse {
  isValid: boolean;
  assetId?: string;
  metadata?: {
    originalFilename: string;
    uploadTimestamp: string;
    watermarkApplied: boolean;
  };
  confidence?: number;
}

interface DuplicateCheckResponse {
  isDuplicate: boolean;
  perceptualHash: string;
  existingAsset?: {
    assetId: string;
    originalFilename: string;
    uploadTimestamp: string;
  };
}

interface ProcessingStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  assetId: string;
  watermarkedUrl?: string;
  error?: string;
  progress?: number;
}

class HatchmarkApiClient {
  private baseUrl: string;

  constructor() {
    // Get API Gateway URL from environment variables
    this.baseUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 
                   import.meta.env.VITE_API_GATEWAY_URL || 
                   'http://localhost:3002';
    
    console.log('Hatchmark API Client initialized with baseUrl:', this.baseUrl);
    
    if (!this.baseUrl.startsWith('http')) {
      console.warn('API_GATEWAY_URL not properly configured, using localhost fallback');
      this.baseUrl = 'http://localhost:3002';
    }
  }

  /**
   * Step 1: Initiate upload - gets presigned URL and creates asset record
   */
  async initiateUpload({ filename }: InitiateUploadRequest): Promise<InitiateUploadResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/uploads/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload initiation failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.uploadUrl || !data.objectKey) {
        throw new Error('Invalid response from upload initiation');
      }

      return data;
    } catch (error) {
      console.error('Error initiating upload:', error);
      throw error;
    }
  }

  /**
   * Step 2: Upload file directly to S3 using presigned URL
   */
  async uploadFileToS3(
    uploadUrl: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`S3 upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('S3 upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  /**
   * Step 3: Check processing status and get watermarked file
   */
  async checkProcessingStatus(assetId: string): Promise<ProcessingStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${encodeURIComponent(assetId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking processing status:', error);
      throw error;
    }
  }

  /**
   * Verify artwork authenticity
   */
  async verifyArtwork(file: File): Promise<VerificationResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/verify`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error verifying artwork:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate content before upload
   */
  async checkDuplicate(file: File): Promise<DuplicateCheckResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/uploads/check-duplicate`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Duplicate check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      throw error;
    }
  }

  /**
   * Complete upload workflow: initiate -> upload -> poll for completion
   */
  async uploadAndProcess(
    file: File,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<{ assetId: string; watermarkedUrl: string }> {
    try {
      // Stage 1: Check for duplicates
      onProgress?.('Checking for duplicates...', 10);
      const duplicateCheck = await this.checkDuplicate(file);
      
      if (duplicateCheck.isDuplicate) {
        throw new Error('This file has already been uploaded and watermarked');
      }

      // Stage 2: Initiate upload
      onProgress?.('Initiating upload...', 20);
      const { uploadUrl, objectKey, assetId } = await this.initiateUpload({ 
        filename: file.name 
      });

      // Stage 3: Upload to S3
      onProgress?.('Uploading to secure storage...', 30);
      await this.uploadFileToS3(uploadUrl, file, (uploadProgress) => {
        onProgress?.('Uploading to secure storage...', 30 + (uploadProgress * 0.3));
      });

      // Stage 4: Wait for processing
      onProgress?.('Processing and watermarking...', 60);
      
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const status = await this.checkProcessingStatus(assetId);
        
        if (status.status === 'completed' && status.watermarkedUrl) {
          onProgress?.('Complete!', 100);
          return {
            assetId,
            watermarkedUrl: status.watermarkedUrl
          };
        }
        
        if (status.status === 'failed') {
          throw new Error(status.error || 'Processing failed');
        }
        
        // Update progress based on status
        const progressMap = {
          'pending': 65,
          'processing': 80,
        };
        
        onProgress?.(`Processing and watermarking... (${status.status})`, 
                    progressMap[status.status] || 70);
        
        attempts++;
      }
      
      throw new Error('Processing timeout - please check back later');
      
    } catch (error) {
      console.error('Error in upload and process workflow:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new HatchmarkApiClient();

// Export types
export type { 
  InitiateUploadResponse, 
  InitiateUploadRequest, 
  VerificationResponse,
  DuplicateCheckResponse,
  ProcessingStatusResponse 
};
