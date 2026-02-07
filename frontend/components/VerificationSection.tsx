import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, Clock, Upload, FileImage, AlertTriangle } from "lucide-react";

interface VerificationResult {
  assetId: string;
  filename: string;
  status: 'verified' | 'unknown' | 'error' | 'modified';
  confidence: number;
  timestamp: string;
  creator?: string;
  verification_note?: string;
}

const VerificationSection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [verificationMode, setVerificationMode] = useState<'search' | 'upload'>('search');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];
      if (file.type.startsWith('image/')) {
        setUploadedFile(file);
        setVerificationMode('upload');
        handleImageVerification(file);
      } else {
        setError('Please upload an image file (JPG, PNG, etc.)');
      }
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setUploadedFile(selectedFile);
      setVerificationMode('upload');
      handleImageVerification(selectedFile);
    }
  }, []);

  const handleImageVerification = async (file: File) => {
    setIsLoading(true);
    setError('');
    setVerificationResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:3002/verify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.statusText}`);
      }

      const result = await response.json();
      setVerificationResult(result);
    } catch (error) {
      console.error('Image verification failed:', error);
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter an asset ID or filename to search');
      return;
    }

    setIsLoading(true);
    setError('');
    setVerificationResult(null);

    try {
      const response = await fetch(`http://localhost:3002/verify?assetId=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const result = await response.json();
      setVerificationResult(result);
    } catch (error) {
      console.error('Search failed:', error);
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetVerification = () => {
    setSearchQuery('');
    setVerificationResult(null);
    setError('');
    setUploadedFile(null);
    setVerificationMode('search');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'modified':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'modified':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <section id="verify" className="py-24">
      <div className="max-width section-padding">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance mb-6">
            Verify authenticity instantly
          </h2>
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Upload an image or search by Asset ID to verify if digital content has been tampered with.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setVerificationMode('search')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                verificationMode === 'search'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Search className="w-4 h-4 inline mr-2" />
              Search by Asset ID
            </button>
            <button
              onClick={() => setVerificationMode('upload')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                verificationMode === 'upload'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Upload Image
            </button>
          </div>
        </div>

        {verificationMode === 'search' && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-3">
              <Input
                placeholder="Enter Asset ID or filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
                disabled={isLoading}
              />
              <Button onClick={handleSearch} disabled={isLoading || !searchQuery.trim()}>
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {isLoading ? 'Searching...' : 'Verify'}
              </Button>
            </div>
          </div>
        )}

        {verificationMode === 'upload' && (
          <div className="max-w-2xl mx-auto mb-8">
            <div
              className={`
                relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
                ${isDragging 
                  ? 'border-primary bg-primary/5 scale-105' 
                  : 'border-border hover:border-primary/50 hover:bg-primary/5'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isLoading}
              />

              <div className="space-y-4">
                <div className="flex justify-center">
                  <Upload className="w-12 h-12 text-muted-foreground" />
                </div>
                
                {uploadedFile ? (
                  <div className="flex items-center justify-center gap-3 p-4 bg-background rounded-lg border">
                    <FileImage className="w-6 h-6 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{uploadedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-lg font-medium">
                      Drop your image here to verify authenticity
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supports: JPG, PNG, GIF, WebP • Maximum file size: 50MB
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="p-4 bg-red-100 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          </div>
        )}

        {verificationResult && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {getStatusIcon(verificationResult.status)}
                  Verification Result
                  <Badge className={getStatusColor(verificationResult.status)}>
                    {verificationResult.status.toUpperCase()}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {verificationResult.status === 'verified' 
                    ? 'Asset authenticity has been verified'
                    : verificationResult.status === 'modified'
                    ? 'Asset appears to have been modified'
                    : 'Asset not found in our database'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Asset ID</h4>
                    <p className="font-mono text-sm bg-muted p-2 rounded">{verificationResult.assetId}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Filename</h4>
                    <p className="text-sm">{verificationResult.filename}</p>
                  </div>
                  {verificationResult.status === 'verified' && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Registered</h4>
                      <p className="text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(verificationResult.timestamp).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {verificationResult.creator && verificationResult.status === 'verified' && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Creator</h4>
                      <p className="text-sm">{verificationResult.creator}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={resetVerification} variant="outline" className="w-full">
                    Verify Another Asset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
};

export default VerificationSection;