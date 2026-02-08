'use client';

import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { Shield, ExternalLink, Loader2, Wallet, Download, X, Award } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useCallback } from 'react';
import { Certificate } from '@/components/Certificate';
import { downloadCertificate } from '@/lib/downloadCertificate';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';

interface Cert {
  id: string;
  hash: string;
  title: string;
  timestamp: number;
}

export default function DashboardPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const [selectedCert, setSelectedCert] = useState<Cert | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  const { data: certs, isLoading } = useQuery({
    queryKey: ['certs', account?.address],
    queryFn: async () => {
      if (!account?.address) return [];

      const { data } = await client.getOwnedObjects({
        owner: account.address,
        filter: { StructType: `${PACKAGE_ID}::registry::RegistrationCertificate` },
        options: { showContent: true },
      });

      return data.map((obj) => {
        const content = obj.data?.content;
        if (content?.dataType !== 'moveObject') return null;
        const fields = content.fields as Record<string, unknown>;
        const bytes = fields.image_hash as number[] || [];
        return {
          id: obj.data?.objectId || '',
          hash: bytes.map(b => b.toString(16).padStart(2, '0')).join(''),
          title: fields.title as string || 'Untitled',
          timestamp: Number(fields.timestamp) || 0,
        };
      }).filter((c): c is Cert => c !== null);
    },
    enabled: !!account?.address,
  });

  const formatDate = (ts: number) => {
    if (!ts) return 'Unknown';
    return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleDownload = useCallback(async () => {
    if (!certificateRef.current || !selectedCert) return;
    
    setIsDownloading(true);
    try {
      await downloadCertificate(
        certificateRef.current,
        `hatchmark-certificate-${selectedCert.title.replace(/\s+/g, '-').toLowerCase()}`
      );
    } catch (error) {
      console.error('Failed to download certificate:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [selectedCert]);

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-6 h-6 text-neutral-400" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">Connect Wallet</h1>
          <p className="text-neutral-500 text-sm">Connect to view your certificates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-2">My Certificates</h1>
            <p className="text-neutral-500">Content registered on the blockchain</p>
          </div>
          <Link
            href="/register"
            className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
          >
            Register New
          </Link>
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">Loading...</p>
          </div>
        )}

        {!isLoading && certs && certs.length === 0 && (
          <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-neutral-400" />
            </div>
            <h2 className="font-semibold text-neutral-900 dark:text-white mb-2">No certificates</h2>
            <p className="text-neutral-500 text-sm mb-4">Register your first content</p>
            <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
              Register Content
            </Link>
          </div>
        )}

        {certs && certs.length > 0 && (
          <>
            <p className="text-sm text-neutral-500 mb-6">{certs.length} certificate{certs.length !== 1 ? 's' : ''}</p>
            <div className="grid md:grid-cols-2 gap-4">
              {certs.map((cert) => (
                <div key={cert.id} className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-neutral-500" />
                    </div>
                    <a
                      href={`https://suiscan.xyz/testnet/object/${cert.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <h3 className="font-medium text-neutral-900 dark:text-white mb-1 truncate">{cert.title}</h3>
                  <p className="text-sm text-neutral-500 mb-3">{formatDate(cert.timestamp)}</p>
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2 mb-3">
                    <code className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                      {cert.hash.slice(0, 16)}...
                    </code>
                  </div>
                  <button
                    onClick={() => setSelectedCert(cert)}
                    className="w-full flex items-center justify-center gap-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Award className="w-4 h-4" />
                    View Certificate
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Certificate Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Certificate</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isDownloading ? 'Downloading...' : 'Download'}
                </button>
                <button
                  onClick={() => setSelectedCert(null)}
                  className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Certificate Content */}
            <div className="p-6">
              <Certificate
                ref={certificateRef}
                data={{
                  id: selectedCert.id,
                  hash: selectedCert.hash,
                  title: selectedCert.title,
                  timestamp: selectedCert.timestamp,
                  owner: account?.address,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
