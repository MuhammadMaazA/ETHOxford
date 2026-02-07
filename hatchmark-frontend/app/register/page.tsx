'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import toast from 'react-hot-toast';
import { Upload, Image as ImageIcon, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { computePerceptualHash } from '@/lib/phash';
import { AIDetectionBadge, type AIDetectionResult } from '@/components/AIDetectionBadge';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';

interface DuplicateInfo {
  isDuplicate: boolean;
  existingCert?: { title: string; creator: string; registered_at: number };
}

export default function RegisterPage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [preview, setPreview] = useState<string | null>(null);
  const [hash, setHash] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [aiDetection, setAiDetection] = useState<AIDetectionResult | null>(null);
  const [isDetectingAI, setIsDetectingAI] = useState(false);

  const checkDuplicate = useCallback(async (h: string) => {
    setChecking(true);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: h }),
      });
      const data = await res.json();
      
      if (data.exactMatch) {
        setDuplicate({ isDuplicate: true, existingCert: data.exactMatch });
        toast.error('Already registered!');
      } else if (data.matches?.length && data.matches[0].similarity >= 70) {
        setDuplicate({ isDuplicate: true, existingCert: data.matches[0] });
        toast.error('Similar image registered!');
      } else {
        setDuplicate({ isDuplicate: false });
        toast.success('Ready to register');
      }
    } catch {
      setDuplicate({ isDuplicate: false });
    } finally {
      setChecking(false);
    }
  }, []);

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
        
        if (data.isAIGenerated && data.confidence > 70) {
          toast('This image appears to be AI-generated', { icon: '🤖' });
        }
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

    setDuplicate(null);
    setAiDetection(null);
    setPreview(URL.createObjectURL(file));
    const h = await computePerceptualHash(file);
    setHash(h);
    
    await Promise.all([
      checkDuplicate(h),
      detectAI(file),
    ]);
  }, [checkDuplicate, detectAI]);

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

  const handleRegister = async () => {
    if (!account) return toast.error('Connect wallet first');
    if (!hash) return toast.error('Upload an image first');
    if (!title.trim()) return toast.error('Enter a title');
    if (duplicate?.isDuplicate) return toast.error('Already registered');

    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::registry::register`,
      arguments: [
        tx.pure.vector('u8', hexToBytes(hash)),
        tx.pure.string(title),
        tx.pure.string(description),
        tx.object('0x6'),
      ],
    });

    signAndExecute({ transaction: tx }, {
      onSuccess: async (result) => {
        setTxDigest(result.digest);
        toast.success('Registered!');
        try {
          await fetch('/api/register-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_hash: hash,
              creator: account?.address,
              title,
              description,
              tx_digest: result.digest,
            }),
          });
        } catch {}
      },
      onError: (err) => toast.error('Failed: ' + err.message),
    });
  };

  if (txDigest) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">Registered!</h1>
          <p className="text-neutral-500 mb-6">Your content is now on the blockchain</p>
          <a
            href={`https://suiscan.xyz/testnet/tx/${txDigest}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            View transaction <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-2">Register Content</h1>
          <p className="text-neutral-500">Upload an image to register ownership on the blockchain</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
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
              <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl">
                <p className="text-xs text-neutral-500 mb-1">Hash</p>
                <code className="text-sm font-mono text-neutral-700 dark:text-neutral-300 break-all">{hash}</code>
              </div>
            )}

            {checking && (
              <div className="mt-4 flex items-center gap-2 text-neutral-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking...
              </div>
            )}

            {duplicate?.isDuplicate && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <p className="text-red-700 dark:text-red-400 text-sm font-medium">Already registered</p>
                {duplicate.existingCert && (
                  <p className="text-red-600 dark:text-red-500 text-xs mt-1">
                    "{duplicate.existingCert.title}" by {duplicate.existingCert.creator.slice(0, 8)}...
                  </p>
                )}
              </div>
            )}

            {/* AI Detection */}
            {(isDetectingAI || aiDetection) && (
              <AIDetectionBadge result={aiDetection} isLoading={isDetectingAI} />
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My artwork"
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                rows={3}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white resize-none"
              />
            </div>

            <button
              onClick={handleRegister}
              disabled={!account || !hash || !title || duplicate?.isDuplicate || isPending}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-3 rounded-xl font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isPending ? 'Registering...' : 'Register on Blockchain'}
            </button>

            {!account && (
              <p className="text-center text-sm text-neutral-500">Connect wallet to register</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
