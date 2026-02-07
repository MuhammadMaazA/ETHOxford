'use client';

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { Shield, ExternalLink, Calendar, Hash, Loader2, Wallet } from 'lucide-react';
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

  const { data: certificates, isLoading, error } = useQuery({
    queryKey: ['certificates', account?.address],
    queryFn: async () => {
      if (!account?.address) return [];

      const objects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${PACKAGE_ID}::registry::RegistrationCertificate`,
        },
        options: {
          showContent: true,
        },
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Not connected state
  if (!account) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-10 h-10 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h1>
        <p className="text-gray-600 mb-8">
          Connect your wallet to view your registered content certificates
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Certificates</h1>
          <p className="text-gray-600">
            Content you've registered on the Sui blockchain
          </p>
        </div>
        <Link
          href="/register"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Register New
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your certificates...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">Failed to load certificates. Please try again.</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && certificates && certificates.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Certificates Yet</h2>
          <p className="text-gray-600 mb-6">
            You haven't registered any content yet
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Register Your First Content
          </Link>
        </div>
      )}

      {/* Certificates Grid */}
      {certificates && certificates.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <a
                  href={`https://suiscan.xyz/testnet/object/${cert.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                {cert.title}
              </h3>

              {cert.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {cert.description}
                </p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(cert.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Hash className="w-4 h-4" />
                  <code className="text-xs truncate max-w-[180px]">
                    {cert.imageHash.slice(0, 16)}...
                  </code>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <code className="text-xs text-gray-400 block truncate">
                  {cert.id}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
