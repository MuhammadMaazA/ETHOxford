'use client';

import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { LogOut } from 'lucide-react';

export function WalletConnect() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <ConnectButton
      connectText="Connect"
      className="!bg-neutral-900 dark:!bg-white !text-white dark:!text-neutral-900 !px-4 !py-2 !rounded-lg !text-sm !font-medium hover:!bg-neutral-800 dark:hover:!bg-neutral-100 !transition-colors !border-0 !shadow-none"
    />
  );
}
