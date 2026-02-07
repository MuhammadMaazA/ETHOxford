export const NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet';

export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || 
  '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';

export const SUI_CLOCK = '0x6';

export function hexToBytes(hex: string): number[] {
  const clean = hex.replace(/^0x/, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.substr(i, 2), 16));
  }
  return bytes;
}

export function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getExplorerUrl(id: string, type: 'object' | 'tx' | 'address' = 'object'): string {
  const base = NETWORK === 'mainnet' ? 'https://suiscan.xyz/mainnet' : `https://suiscan.xyz/${NETWORK}`;
  return `${base}/${type}/${id}`;
}
