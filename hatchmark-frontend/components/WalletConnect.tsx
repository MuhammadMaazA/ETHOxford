'use client';

import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { Wallet } from 'lucide-react';

export function WalletConnect() {
  const account = useCurrentAccount();

  return (
    <div className="flex items-center gap-2">
      {account ? (
        <div className="flex items-center gap-2 text-sm">
          <Wallet className="w-4 h-4 text-green-500" />
          <span className="text-gray-600 hidden sm:inline">
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </span>
        </div>
      ) : null}
      <ConnectButton 
        connectText="Connect Wallet"
        className="!bg-blue-600 hover:!bg-blue-700 !text-white !px-4 !py-2 !rounded-lg !font-medium !transition-colors"
      />
    </div>
  );
}
