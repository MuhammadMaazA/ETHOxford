'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import toast from 'react-hot-toast';
import { Image as ImageIcon, AlertTriangle, CheckCircle, Loader2, Flag, ExternalLink } from 'lucide-react';
import { computePerceptualHash } from '@/lib/phash';

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
    const hash = await computePerceptualHash(file);
    return hash;
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setResult(null);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    const hash = await computeHash(file);
    setImageHash(hash);

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
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-2">
            Verify Content
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Check if an image has been registered on the blockchain
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 mb-8 ${
            isDragActive
              ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900'
              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
          }`}
        >
          <input {...getInputProps()} />
          {imagePreview ? (
            <div className="space-y-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-48 mx-auto rounded-lg"
              />
              <p className="text-sm text-neutral-500">Click or drag to check another image</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto">
                <ImageIcon className="w-6 h-6 text-neutral-400" />
              </div>
              <div>
                <p className="text-neutral-700 dark:text-neutral-300 font-medium">
                  Drop an image to verify
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  or click to browse
                </p>
              </div>
            </div>
          )}
        </div>

        {isVerifying && (
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-8 text-center border border-neutral-200 dark:border-neutral-800">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-600 dark:text-neutral-400">Checking registry...</p>
          </div>
        )}

        {result && !isVerifying && (
          <div className="space-y-6">
            {result.isOriginal ? (
              <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">
                      Original Content
                    </h2>
                    <p className="text-sm text-neutral-500">
                      No matches found in {result.totalRegistrations} registrations
                    </p>
                  </div>
                </div>
              </div>
            ) : result.exactMatch && account && result.exactMatch.creator === account.address ? (
              <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">
                      Your Registration
                    </h2>
                    <p className="text-sm text-neutral-500">
                      &quot;{result.exactMatch.title}&quot; • {formatDate(result.exactMatch.registered_at)}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://suiscan.xyz/testnet/object/${result.exactMatch.cert_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Explorer
                </a>
              </div>
            ) : (
              <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-neutral-900 dark:text-white">
                      Already Registered
                    </h2>
                    <p className="text-sm text-neutral-500">
                      {result.matches.length} match(es) found
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {result.matches.map((match) => (
                    <div
                      key={match.cert_id}
                      className="bg-white dark:bg-neutral-950 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-neutral-900 dark:text-white">{match.title}</h3>
                          <p className="text-sm text-neutral-500 mt-1">
                            {formatDate(match.registered_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-semibold ${
                            match.similarity >= 95 ? 'text-red-600 dark:text-red-400' :
                            match.similarity >= 90 ? 'text-orange-600 dark:text-orange-400' : 
                            'text-yellow-600 dark:text-yellow-400'
                          }`}>
                            {match.similarity}%
                          </span>
                          <p className="text-xs text-neutral-500">match</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`https://suiscan.xyz/testnet/object/${match.cert_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                        {match.similarity >= 90 && account && match.creator !== account.address && (
                          <button
                            onClick={() => handleFlag(match)}
                            disabled={isFlagging}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50"
                          >
                            <Flag className="w-3 h-3" />
                            {isFlagging ? 'Filing...' : 'Flag'}
                          </button>
                        )}
                        {account && match.creator === account.address && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-lg">
                            <CheckCircle className="w-3 h-3" />
                            Yours
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {imageHash && (
              <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 mb-1">Content Hash</p>
                <code className="text-xs text-neutral-700 dark:text-neutral-300 font-mono break-all">
                  {imageHash}
                </code>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
