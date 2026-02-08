// Sui Network Configuration
export const NETWORK = 'testnet';
export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';
export const MODULE_NAME = 'content_registry';

// API Endpoints
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Supabase Configuration
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Constants
export const SIMILARITY_THRESHOLD = 0.9; // 90% similarity threshold
export const HAMMING_DISTANCE_THRESHOLD = 6; // For 64-bit hash comparison