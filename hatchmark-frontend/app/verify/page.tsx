'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import toast from 'react-hot-toast';
import { Image as ImageIcon, AlertTriangle, CheckCircle, Loader2, Flag, ExternalLink } from 'lucide-react';
import { computePerceptualHash } from '@/lib/phash';
import { AIDetectionBadge, type AIDetectionResult } from '@/components/AIDetectionBadge';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';

// Minimum stake required to file a dispute (0.1 SUI in MIST)
const DISPUTE_STAKE_MIST = 100_000_000;

interface Match {
  cert_id: string;
  image_hash: string;
  creator: string;
  registered_at: number;
  title: string;
  similarity: number;
  hammingDistance: number;
}

interface Result {
  matches: Match[];
  isOriginal: boolean;
  exactMatch: Match | null;
}

export default function VerifyPage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [preview, setPreview] = useState<string | null>(null);
  const [hash, setHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [aiDetection, setAiDetection] = useState<AIDetectionResult | null>(null);
  const [isDetectingAI, setIsDetectingAI] = useState(false);

  const detectAI = useCallback(async (file: File) => {
    setIsDetectingAI(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result?.toString().split(',')[1];
        if (!base64) return;
        
        const res = await fetch('/api/ai-detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const data = await res.json();
        setAiDetection(data);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('AI detection failed:', error);
      setAiDetection(null);
    } finally {
      setTimeout(() => setIsDetectingAI(false), 500);
    }
  }, []);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setResult(null);
    setAiDetection(null);
    setPreview(URL.createObjectURL(file));
    const h = await computePerceptualHash(file);
    setHash(h);

    detectAI(file);

    setVerifying(true);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: h }),
      });
      const data = await res.json();
      setResult(data);
      
      if (data.isOriginal) toast.success('Original content!');
      else toast.error(`Found ${data.matches.length} match(es)`);
    } catch {
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
    }
  }, [detectAI]);

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

  const handleFlag = (match: Match) => {
    if (!account) return toast.error('Connect wallet to flag');

    const tx = new Transaction();

    // Split 0.1 SUI from gas coin for dispute stake
    const [stakeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(DISPUTE_STAKE_MIST)]);

    tx.moveCall({
      target: `${PACKAGE_ID}::registry::flag_content`,
      arguments: [
        tx.object(match.cert_id),
        tx.pure.vector('u8', hexToBytes(hash)),
        tx.pure.u8(Math.min(255, match.hammingDistance)),
        stakeCoin,
        tx.object('0x6'),
      ],
    });

    signAndExecute({ transaction: tx }, {
      onSuccess: () => toast.success('Dispute filed — 0.1 SUI staked'),
      onError: (err) => toast.error('Failed: ' + err.message),
    });
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-2">Verify Content</h1>
          <p className="text-neutral-500">Check if an image has been registered</p>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors mb-8 ${
            isDragActive
              ? 'border-neutral-400 bg-neutral-100 dark:bg-neutral-900'
              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
          }`}
        >
          <input {...getInputProps()} />
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
          ) : (
            <div className="py-8">
              <ImageIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400">Drop image here or click to upload</p>
            </div>
          )}
        </div>

        {hash && (
          <div className="mb-8 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
            <p className="text-xs text-neutral-500 mb-1">Hash</p>
            <code className="text-sm font-mono text-neutral-700 dark:text-neutral-300">{hash}</code>
          </div>
        )}

        {verifying && (
          <div className="flex items-center justify-center gap-2 text-neutral-500 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Verifying...
          </div>
        )}

        {(isDetectingAI || aiDetection) && !verifying && (
          <div className="mb-6">
            <AIDetectionBadge result={aiDetection} isLoading={isDetectingAI} />
          </div>
        )}

        {result && !verifying && (
          <div className="space-y-6">
            {result.isOriginal ? (
              <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 text-center">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-green-800 dark:text-green-300">Original Content</h3>
                <p className="text-green-600 dark:text-green-400 text-sm mt-1">No matches found in registry</p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-800 dark:text-yellow-300">Matches Found</h3>
                    <p className="text-yellow-700 dark:text-yellow-400 text-sm">{result.matches.length} similar content(s)</p>
                    <p className="text-yellow-600 dark:text-yellow-500 text-xs mt-1">
                      Filing a dispute requires staking 0.1 SUI. Stake is returned if valid, forfeited if invalid.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {result.matches.map((match) => {
                    const isOwn = account?.address === match.creator;
                    return (
                      <div key={match.cert_id} className="p-5 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-neutral-900 dark:text-white">{match.title}</h4>
                            <p className="text-sm text-neutral-500">{formatDate(match.registered_at)}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-sm font-medium ${
                            match.similarity >= 95
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }`}>
                            {match.similarity}% match
                          </span>
                        </div>

                        <p className="text-xs text-neutral-500 mb-3 font-mono">
                          {match.creator.slice(0, 12)}...{match.creator.slice(-8)}
                        </p>

                        <div className="flex flex-col gap-3 mt-3">
                          <div className="flex gap-2">
                            <a
                              href={`https://suiscan.xyz/testnet/object/${match.cert_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              View on-chain <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>

                          {isOwn ? (
                            <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">This is your registered content</span>
                              <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">You cannot dispute your own content</p>
                            </div>
                          ) : !account ? (
                            <div className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                              <span className="text-sm text-neutral-600 dark:text-neutral-400">Connect your wallet to file a dispute</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleFlag(match)}
                              disabled={isPending}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium text-sm rounded-lg transition-colors"
                            >
                              <Flag className="w-4 h-4" />
                              {isPending ? 'Staking & Filing...' : 'File Dispute (stakes 0.1 SUI)'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
