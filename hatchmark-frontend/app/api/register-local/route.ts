/**
 * /api/register-local - Immediately insert registration into Supabase
 * 
 * Called after successful blockchain transaction to enable instant duplicate detection
 * (Backup to the blockchain event indexer)
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image_hash, creator, title, description, tx_digest } = body;

    if (!image_hash || !creator) {
      return NextResponse.json(
        { error: 'image_hash and creator are required' },
        { status: 400 }
      );
    }

    // Generate a placeholder cert_id (the real one comes from blockchain events)
    // Using tx_digest as identifier since we don't have the object ID yet
    const cert_id = `pending_${tx_digest || Date.now()}`;

    const registration = {
      cert_id,
      image_hash,
      creator,
      title: title || '',
      description: description || '',
      tx_digest: tx_digest || null,
      registered_at: Date.now(),
    };

    // Upsert - if hash already exists, this will be ignored
    const { error } = await supabase
      .from('registrations')
      .upsert(registration, { 
        onConflict: 'image_hash',
        ignoreDuplicates: true 
      });

    if (error) {
      // Duplicate is expected if indexer already synced
      if (error.code === '23505') {
        return NextResponse.json({ 
          success: true, 
          message: 'Already synced by indexer' 
        });
      }
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Database insert failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Registration cached for instant duplicate detection' 
    });

  } catch (error) {
    console.error('Register-local error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
