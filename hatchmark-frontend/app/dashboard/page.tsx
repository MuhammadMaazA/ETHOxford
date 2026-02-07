'use client';

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { Shield, ExternalLink, Loader2, Wallet } from 'lucide-react';
import Link from 'next/link';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || 
  '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';

interface Certificate {
  id: string;
  imageHash: string;
  title: string;
  description: string;
  timestamp: number;
}

export default function DashboardPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();

  const { data: certificates, isLoading } = useQuery({
    queryKey: ['certificates', account?.address],
    queryFn: async () => {
      if (!account?.address) return [];

      const objects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${PACKAGE_ID}::registry::RegistrationCertificate`,
        },
        options: { showContent: true },
      });

      return objects.data.map((obj) => {
        const content = obj.data?.content;
        if (content?.dataType !== 'moveObject') return null;
        
        const fields = content.fields as Record<string, unknown>;
        return {
          id: obj.data?.objectId || '',
          imageHash: bytesToHex(fields.image_hash as number[] || []),
          title: fields.title as string || 'Untitled',
          description: fields.description as string || '',
          timestamp: Number(fields.timestamp) || 0,
        };
      }).filter((c): c is Certificate => c !== null);
    },
    enabled: !!account?.address,
  });

  const bytesToHex = (bytes: number[]): string => {
    if (!Array.isArray(bytes)) return String(bytes);
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-6 h-6 text-neutral-400" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">Connect Wallet</h1>
          <p className="text-neutral-500 text-sm">
            Connect your wallet to view your certificates
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-2">
              My Certificates
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              Content you&apos;ve registered on the blockchain
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
          >
            Register New
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">Loading certificates...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && certificates && certificates.length === 0 && (
          <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-neutral-400" />
            </div>
            <h2 className="font-semibold text-neutral-900 dark:text-white mb-2">No certificates yet</h2>
            <p className="text-neutral-500 text-sm mb-4">Register your first content to get started</p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
            >
              Register Content
            </Link>
          </div>
        )}

        {/* Certificates Grid */}
        {certificates && certificates.length > 0 && (
          <>
            <p className="text-sm text-neutral-500 mb-6">
              {certificates.length} certificate{certificates.length !== 1 ? 's' : ''}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-neutral-500" />
                    </div>
                    <a
                      href={`https://suiscan.xyz/testnet/object/${cert.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <h3 className="font-medium text-neutral-900 dark:text-white mb-1 truncate">
                    {cert.title}
                  </h3>
                  
                  <p className="text-sm text-neutral-500 mb-3">
                    {formatDate(cert.timestamp)}
                  </p>

                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2">
                    <code className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                      {cert.imageHash.slice(0, 16)}...
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
