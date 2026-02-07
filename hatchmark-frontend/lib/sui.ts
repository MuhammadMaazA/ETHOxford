/**
 * Sui client configuration for Hatchmark
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// Use testnet by default
const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet' | 'devnet';
export const NETWORK = network;

// Sui client singleton
export const suiClient = new SuiClient({ 
  url: getFullnodeUrl(network) 
});

// Package ID for Hatchmark contracts
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || 
  '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';

// Sui system Clock object
export const SUI_CLOCK = '0x6';

// Helper: Convert hex string to byte array
export function hexToBytes(hex: string): number[] {
  const cleanHex = hex.replace(/^0x/, '');
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16));
  }
  return bytes;
}

// Helper: Convert byte array to hex string
export function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Get explorer URL for an object
export function getExplorerUrl(objectId: string, type: 'object' | 'tx' | 'address' = 'object'): string {
  const baseUrl = network === 'mainnet' 
    ? 'https://suiscan.xyz/mainnet'
    : `https://suiscan.xyz/${network}`;
  return `${baseUrl}/${type}/${objectId}`;
}
