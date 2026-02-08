'use client';

import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield } from 'lucide-react';

export interface CertificateData {
  id: string;
  hash: string;
  title: string;
  timestamp: number;
  owner?: string;
}

interface CertificateProps {
  data: CertificateData;
}

export const Certificate = forwardRef<HTMLDivElement, CertificateProps>(
  ({ data }, ref) => {
    const formatDate = (ts: number) => {
      if (!ts) return 'Unknown';
      return new Date(ts).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const explorerUrl = `https://suiscan.xyz/testnet/object/${data.id}`;
    const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify?hash=${data.hash}`;

    return (
      <div
        ref={ref}
        className="bg-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '2px solid #e5e7eb',
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-10 h-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-neutral-900">Hatchmark</h1>
          </div>
          <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full" />
        </div>

        {/* Certificate Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-neutral-800 mb-2">
            Certificate of Registration
          </h2>
          <p className="text-neutral-500">
            This certifies that the following content has been registered on the Sui blockchain
          </p>
        </div>

        {/* Content Details */}
        <div className="bg-neutral-50 rounded-xl p-6 mb-8 border border-neutral-200">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-500 mb-1">Title</p>
              <p className="text-lg font-semibold text-neutral-900">{data.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Registration Date</p>
                <p className="text-neutral-800 font-medium">{formatDate(data.timestamp)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 mb-1">Certificate ID</p>
                <p className="text-neutral-800 font-mono text-sm break-all">
                  {data.id.slice(0, 16)}...{data.id.slice(-8)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-1">Content Hash (pHash)</p>
              <p className="text-neutral-800 font-mono text-sm break-all bg-white px-3 py-2 rounded border border-neutral-200">
                {data.hash}
              </p>
            </div>
            {data.owner && (
              <div>
                <p className="text-sm text-neutral-500 mb-1">Owner Address</p>
                <p className="text-neutral-800 font-mono text-sm break-all">
                  {data.owner.slice(0, 10)}...{data.owner.slice(-8)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* QR Code and Verification */}
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1">
            <p className="text-sm text-neutral-500 mb-2">Verify on Blockchain</p>
            <p className="text-xs text-neutral-400 break-all">{explorerUrl}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-neutral-200 shadow-sm">
            <QRCodeSVG
              value={explorerUrl}
              size={100}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-neutral-200 text-center">
          <p className="text-xs text-neutral-400">
            This certificate is cryptographically secured on the Sui blockchain.
            <br />
            Verification URL: {verifyUrl}
          </p>
        </div>
      </div>
    );
  }
);

Certificate.displayName = 'Certificate';

export default Certificate;
