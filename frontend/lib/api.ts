interface InitiateUploadResponse {
  uploadUrl: string;
  objectKey: string;
}

interface InitiateUploadRequest {
  filename: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    // Support both Next.js and Vite environment variables
    this.baseUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 
                   process.env.VITE_API_URL || 
                   'http://localhost:3002';
    
    console.log('API Client initialized with baseUrl:', this.baseUrl);
    
    if (!this.baseUrl.startsWith('http')) {
      console.warn('API_GATEWAY_URL not properly configured, using localhost fallback');
      this.baseUrl = 'http://localhost:3002';
    }
  }

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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error initiating upload:', error);
      throw error;
    }
  }

  async uploadFileToS3(uploadUrl: string, file: File, onProgress?: (progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

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
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  async checkProcessingStatus(objectKey: string): Promise<{ status: string; watermarkedUrl?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${encodeURIComponent(objectKey)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking status:', error);
      throw error;
    }
  }

  async verifyArtwork(file: File): Promise<{ isValid: boolean; hash?: string; metadata?: any }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/verify`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error verifying artwork:', error);
      throw error;
    }
  }

  async checkDuplicate(file: File): Promise<{ isDuplicate: boolean; perceptualHash?: string; existingAsset?: any }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/uploads/check-duplicate`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking duplicate:', error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
export type { InitiateUploadResponse, InitiateUploadRequest };
