import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey);

export function getServerSupabase() {
  return createClient(url, process.env.SUPABASE_SERVICE_KEY!);
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
