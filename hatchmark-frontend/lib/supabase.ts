import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

export { getSupabase as supabase };

export function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export interface Registration {
  cert_id: string;
  image_hash: string;
  creator: string;
  registered_at: number;
  title: string;
  description?: string;
  tx_digest?: string;
}

export interface Dispute {
  dispute_id: string;
  original_cert_id: string;
  flagged_hash: string;
  flagger: string;
  similarity_score: number;
  status: number;
  event_time: number;
}
