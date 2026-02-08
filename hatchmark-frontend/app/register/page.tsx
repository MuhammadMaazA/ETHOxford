'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import toast from 'react-hot-toast';
import { Upload, Image as ImageIcon, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { computePerceptualHash } from '@/lib/phash';
import { AIDetectionBadge, type AIDetectionResult } from '@/components/AIDetectionBadge';

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
  const [aiDetection, setAiDetection] = useState<AIDetectionResult | null>(null);
  const [isDetectingAI, setIsDetectingAI] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
        setDuplicateInfo({ isDuplicate: true, existingCert: data.exactMatch });
        toast.error('This image is already registered!');
      } else if (data.matches && data.matches.length > 0 && data.matches[0].similarity >= 70) {
        setDuplicateInfo({ isDuplicate: true, existingCert: data.matches[0] });
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

  const computeHash = useCallback(async (file: File) => {
    const hash = await computePerceptualHash(file);
    return hash;
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
      // Small delay to ensure state updates properly
      setTimeout(() => setIsDetectingAI(false), 500);
    }
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setDuplicateInfo(null);
    setAiDetection(null);
    setUploadedFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    const hash = await computeHash(file);
    setImageHash(hash);

    // Run duplicate check and AI detection in parallel
    await Promise.all([
      checkDuplicate(hash),
      detectAI(file),
    ]);
  }, [computeHash, checkDuplicate, detectAI]);

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
          onSuccess: async (result) => {
            setTxDigest(result.digest);
            toast.success('Content registered successfully!');

            try {
              await fetch('/api/register-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  image_hash: imageHash,
                  creator: account?.address,
                  title: title,
                  description: description,
                  tx_digest: result.digest,
                }),
              });
            } catch (e) {
              console.log('Local sync skipped:', e);
            }
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

  const explorerUrl = txDigest ? `https://suiscan.xyz/testnet/tx/${txDigest}` : null;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-2">
            Register Content
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Upload an image to register its ownership on the blockchain
          </p>
        </div>

        {/* Success State */}
        {txDigest && (
          <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900 dark:text-white">Registration Complete</h2>
                <p className="text-sm text-neutral-500">Your content is now protected on-chain</p>
              </div>
            </div>
            <a
              href={explorerUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on Explorer
            </a>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
              }`}
            >
              <input {...getInputProps()} />
              {imagePreview ? (
                <div className="space-y-3">
                  <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                  <p className="text-sm text-neutral-500">Click or drag to replace</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto">
                    <ImageIcon className="w-6 h-6 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-neutral-700 dark:text-neutral-300 font-medium">Drop your image here</p>
                    <p className="text-sm text-neutral-500 mt-1">or click to browse</p>
                  </div>
                </div>
              )}
            </div>

            {/* Hash Display */}
            {imageHash && (
              <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 mb-1">Content Hash</p>
                <code className="text-xs text-neutral-700 dark:text-neutral-300 font-mono break-all">
                  {imageHash}
                </code>
              </div>
            )}

            {/* Status Messages */}
            {isChecking && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking registry...
              </div>
            )}

            {duplicateInfo?.isDuplicate && duplicateInfo.existingCert && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4">
                <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Already Registered</p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  &quot;{duplicateInfo.existingCert.title}&quot; • {new Date(duplicateInfo.existingCert.registered_at).toLocaleDateString()}
                </p>
              </div>
            )}

            {duplicateInfo && !duplicateInfo.isDuplicate && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                Original content - ready to register
              </div>
            )}

            {/* AI Detection */}
            {(isDetectingAI || aiDetection) && (
              <AIDetectionBadge result={aiDetection} isLoading={isDetectingAI} />
            )}
          </div>

          {/* Form Section */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Artwork"
                className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Description <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your content..."
                rows={4}
                className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all resize-none"
              />
            </div>

            {!account ? (
              <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Connect your wallet to register content
                </p>
              </div>
            ) : (
              <button
                onClick={handleRegister}
                disabled={!imageHash || !title || isPending || isChecking || duplicateInfo?.isDuplicate}
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-3 rounded-xl font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Register on Blockchain
                  </>
                )}
              </button>
            )}

            <p className="text-xs text-neutral-500 text-center">
              Registration requires a small amount of SUI for gas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
