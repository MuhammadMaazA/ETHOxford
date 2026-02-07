'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import toast from 'react-hot-toast';
import { Image as ImageIcon, AlertTriangle, CheckCircle, Loader2, Flag, ExternalLink } from 'lucide-react';
import md5 from 'blueimp-md5';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || 
  '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';
const SUI_CLOCK = '0x6';

interface Match {
  cert_id: string;
  image_hash: string;
  creator: string;
  registered_at: number;
  title: string;
  similarity: number;
  hammingDistance: number;
}

interface VerifyResult {
  matches: Match[];
  isOriginal: boolean;
  exactMatch: Match | null;
  totalRegistrations: number;
}

export default function VerifyPage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending: isFlagging } = useSignAndExecuteTransaction();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageHash, setImageHash] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const computeHash = useCallback(async (file: File) => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        const hash = md5(data);
        resolve(hash);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setResult(null);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    const hash = await computeHash(file);
    setImageHash(hash);

    // Automatically verify
    setIsVerifying(true);
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash }),
      });
      const data = await response.json();
      setResult(data);

      if (data.isOriginal) {
        toast.success('This appears to be original content!');
      } else {
        toast.error(`Found ${data.matches.length} similar content(s)!`);
      }
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, [computeHash]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1,
  });

  const hexToBytes = (hex: string): number[] => {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  };

  const handleFlag = async (match: Match) => {
    if (!account) {
      toast.error('Please connect your wallet to flag content');
      return;
    }

    try {
      const tx = new Transaction();
      const hashBytes = hexToBytes(imageHash);
      // Contract expects hammingDistance as u8 (0-255), not similarity percentage
      const similarityScore = Math.min(255, match.hammingDistance);

      tx.moveCall({
        target: `${PACKAGE_ID}::registry::flag_content`,
        arguments: [
          tx.object(match.cert_id),
          tx.pure.vector('u8', hashBytes),
          tx.pure.u8(similarityScore),
          tx.object(SUI_CLOCK),
        ],
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            toast.success('Dispute filed successfully!');
          },
          onError: (error) => {
            console.error('Flag failed:', error);
            toast.error('Failed to file dispute: ' + error.message);
          },
        }
      );
    } catch (error) {
      console.error('Error flagging:', error);
      toast.error('Failed to build transaction');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Content</h1>
        <p className="text-gray-600">
          Check if an image has been registered or if similar content exists
        </p>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-8 ${
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
              className="max-h-48 mx-auto rounded-lg shadow-md"
            />
            <p className="text-sm text-gray-500">Click or drag to check another image</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="text-gray-700 font-medium">
                Drop an image to verify, or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                We&apos;ll check it against the on-chain registry
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isVerifying && (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Checking against registry...</p>
        </div>
      )}

      {/* Results */}
      {result && !isVerifying && (
        <div className="space-y-6">
          {/* Original Content */}
          {result.isOriginal ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <h2 className="text-xl font-semibold text-green-800">
                    Appears to be Original
                  </h2>
                  <p className="text-green-700">
                    No similar content found in the registry ({result.totalRegistrations} checked)
                  </p>
                </div>
              </div>
            </div>
          ) : result.exactMatch && account && result.exactMatch.creator === account.address ? (
            // User is the original creator - show ownership confirmation
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-blue-500" />
                <div>
                  <h2 className="text-xl font-semibold text-blue-800">
                    This is YOUR Registered Content ✓
                  </h2>
                  <p className="text-blue-700">
                    You registered &quot;{result.exactMatch.title}&quot; on {formatDate(result.exactMatch.registered_at)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <a
                  href={`https://suiscan.xyz/testnet/object/${result.exactMatch.cert_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Your Certificate on Sui Explorer
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <h2 className="text-xl font-semibold text-red-800">
                    Content Already Registered by Someone Else
                  </h2>
                  <p className="text-red-700">
                    {result.matches.length} match(es) found - if you believe this is YOUR original work, you can flag it
                  </p>
                </div>
              </div>

              {/* Matches List */}
              <div className="space-y-4 mt-6">
                {result.matches.map((match) => (
                  <div
                    key={match.cert_id}
                    className="bg-white rounded-lg p-4 border border-red-100"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-gray-900">{match.title}</h3>
                        <p className="text-sm text-gray-500">
                          Registered: {formatDate(match.registered_at)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Creator: {match.creator.slice(0, 8)}...{match.creator.slice(-6)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          match.similarity >= 95 ? 'text-red-600' : 
                          match.similarity >= 90 ? 'text-orange-600' : 'text-yellow-600'
                        }`}>
                          {match.similarity}%
                        </div>
                        <p className="text-xs text-gray-500">similarity</p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <a
                        href={`https://suiscan.xyz/testnet/object/${match.cert_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Certificate
                      </a>
                      {/* Only show Flag button if user is NOT the creator */}
                      {match.similarity >= 90 && account && match.creator !== account.address && (
                        <button
                          onClick={() => handleFlag(match)}
                          disabled={isFlagging}
                          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                        >
                          <Flag className="w-4 h-4" />
                          {isFlagging ? 'Filing...' : 'Flag as Stolen'}
                        </button>
                      )}
                      {account && match.creator === account.address && (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Your Registration
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hash Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Computed Hash</p>
            <code className="text-xs text-gray-800 break-all font-mono">
              {imageHash}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
