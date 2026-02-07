import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const { image_hash, creator, title, description, tx_digest } = await req.json();

    if (!image_hash || !creator) {
      return NextResponse.json({ error: 'image_hash and creator required' }, { status: 400 });
    }

    const registration = {
      cert_id: `pending_${tx_digest || Date.now()}`,
      image_hash,
      creator,
      title: title || '',
      description: description || '',
      tx_digest: tx_digest || null,
      registered_at: Date.now(),
    };

    const { error } = await supabase
      .from('registrations')
      .upsert(registration, { onConflict: 'image_hash', ignoreDuplicates: true });

    if (error && error.code !== '23505') {
      console.error('DB error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Register-local error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
