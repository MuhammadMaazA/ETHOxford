'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import toast from 'react-hot-toast';
import { Upload, Image as ImageIcon, Hash, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import md5 from 'blueimp-md5';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || 
  '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';
const SUI_CLOCK = '0x6';

export default function RegisterPage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageHash, setImageHash] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    isDuplicate: boolean;
    existingCert?: { title: string; creator: string; registered_at: number };
  } | null>(null);

  // Check if hash already exists in registry
  const checkDuplicate = useCallback(async (hash: string) => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash }),
      });
      const data = await res.json();
      
      if (data.exactMatch) {
        setDuplicateInfo({
          isDuplicate: true,
          existingCert: data.exactMatch,
        });
        toast.error('This image is already registered!');
      } else if (data.matches && data.matches.length > 0 && data.matches[0].similarity >= 95) {
        setDuplicateInfo({
          isDuplicate: true,
          existingCert: data.matches[0],
        });
        toast.error('A very similar image is already registered!');
      } else {
        setDuplicateInfo({ isDuplicate: false });
        toast.success('Image is original - ready to register!');
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
      setDuplicateInfo({ isDuplicate: false });
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Compute hash from image
  const computeHash = useCallback(async (file: File) => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        // Use MD5 for simplicity - produces 32 hex chars (128 bits)
        // In production, use a proper perceptual hash like pHash
        const hash = md5(data);
        resolve(hash);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Reset duplicate info
    setDuplicateInfo(null);

    // Show preview
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    // Compute hash
    const hash = await computeHash(file);
    setImageHash(hash);
    
    // Check for duplicates
    await checkDuplicate(hash);
  }, [computeHash, checkDuplicate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1,
  });

  // Convert hex string to byte array
  const hexToBytes = (hex: string): number[] => {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  };

  const handleRegister = async () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!imageHash) {
      toast.error('Please upload an image first');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    // Block if duplicate detected
    if (duplicateInfo?.isDuplicate) {
      toast.error('Cannot register - this image is already registered!');
      return;
    }

    try {
      const tx = new Transaction();
      const hashBytes = hexToBytes(imageHash);

      tx.moveCall({
        target: `${PACKAGE_ID}::registry::register`,
        arguments: [
          tx.pure.vector('u8', hashBytes),
          tx.pure.string(title),
          tx.pure.string(description),
          tx.object(SUI_CLOCK),
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setTxDigest(result.digest);
            toast.success('Content registered successfully!');
          },
          onError: (error) => {
            console.error('Transaction failed:', error);
            toast.error('Registration failed: ' + error.message);
          },
        }
      );
    } catch (error) {
      console.error('Error building transaction:', error);
      toast.error('Failed to build transaction');
    }
  };

  const explorerUrl = txDigest 
    ? `https://suiscan.xyz/testnet/tx/${txDigest}` 
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Register Content</h1>
        <p className="text-gray-600">
          Upload an image to register its ownership on Sui blockchain
        </p>
      </div>

      {/* Success State */}
      {txDigest && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <h2 className="text-xl font-semibold text-green-800">Registration Complete!</h2>
          </div>
          <p className="text-green-700 mb-4">
            Your content has been registered on the Sui blockchain.
          </p>
          <a
            href={explorerUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
          >
            View on Explorer
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            {imagePreview ? (
              <div className="space-y-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-lg shadow-md"
                />
                <p className="text-sm text-gray-500">Click or drag to replace</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-700 font-medium">
                    Drop your image here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    PNG, JPG, GIF, WEBP up to 10MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Hash Display */}
          {imageHash && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Hash className="w-4 h-4" />
                <span className="font-medium">Content Hash</span>
              </div>
              <code className="text-xs text-gray-800 break-all font-mono bg-white px-3 py-2 rounded border block">
                {imageHash}
              </code>
            </div>
          )}

          {/* Checking Status */}
          {isChecking && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-blue-800">Checking if image is already registered...</span>
            </div>
          )}

          {/* Duplicate Warning */}
          {duplicateInfo?.isDuplicate && duplicateInfo.existingCert && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>This image is already registered!</span>
              </div>
              <div className="text-sm text-red-700">
                <p><strong>Title:</strong> {duplicateInfo.existingCert.title}</p>
                <p><strong>Registered:</strong> {new Date(duplicateInfo.existingCert.registered_at).toLocaleDateString()}</p>
                <p className="text-xs mt-2 text-red-600">
                  Creator: {duplicateInfo.existingCert.creator.slice(0, 10)}...{duplicateInfo.existingCert.creator.slice(-8)}
                </p>
              </div>
            </div>
          )}

          {/* Original Content Confirmation */}
          {duplicateInfo && !duplicateInfo.isDuplicate && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">Image is original - ready to register!</span>
            </div>
          )}
        </div>

        {/* Form Section */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Artwork"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of your content"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {!account ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800">
                Please connect your wallet to register content
              </p>
            </div>
          ) : (
            <button
              onClick={handleRegister}
              disabled={!imageHash || !title || isPending || isChecking || duplicateInfo?.isDuplicate}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Register on Blockchain
                </>
              )}
            </button>
          )}

          <p className="text-xs text-gray-500 text-center">
            Registration requires a small amount of SUI for gas fees
          </p>
        </div>
      </div>
    </div>
  );
}
