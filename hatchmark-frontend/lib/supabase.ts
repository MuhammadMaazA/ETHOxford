/**
 * Supabase client configuration for Hatchmark
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (uses service key for admin operations)
export function getServerSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(supabaseUrl, serviceKey);
}

// Database types
export interface Registration {
  cert_id: string;
  image_hash: string;
  creator: string;
  registered_at: number;
  title: string;
  description?: string;
  tx_digest?: string;
  created_at?: string;
}

export interface Dispute {
  dispute_id: string;
  original_cert_id: string;
  flagged_hash: string;
  flagger: string;
  similarity_score: number;
  status: number; // 0=pending, 1=valid, 2=invalid
  event_time: number;
  created_at?: string;
}
