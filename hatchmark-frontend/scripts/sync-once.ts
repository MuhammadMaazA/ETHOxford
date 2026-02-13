/**
 * Quick sync script to manually index events from Sui into Supabase
 * Run with: npx tsx scripts/sync-once.ts
 */

import { SuiClient } from '@mysten/sui/client';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing required environment variables!');
  console.error('Please create .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const sui = new SuiClient({ url: SUI_RPC_URL });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🔍 Syncing Hatchmark events from Sui to Supabase...\n');

  // Helper to convert byte array to hex string
  function bytesToHex(bytes: number[]): string {
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function extractId(idField: any): string {
    if (typeof idField === 'string') return idField;
    if (idField?.id) return idField.id;
    if (idField?.bytes) return idField.bytes;
    return String(idField);
  }

  // Query RegistrationEvents
  console.log('📝 Fetching RegistrationEvents...');
  try {
    const regEvents = await sui.queryEvents({
      query: { MoveEventType: `${PACKAGE_ID}::registry::RegistrationEvent` },
      limit: 100,
      order: 'ascending'
    });

    console.log(`   Found ${regEvents.data.length} registration events`);

    for (const event of regEvents.data) {
      const parsed = event.parsedJson as any;
      
      const imageHash = Array.isArray(parsed.image_hash) 
        ? bytesToHex(parsed.image_hash)
        : parsed.image_hash;

      const registration = {
        cert_id: extractId(parsed.cert_id),
        image_hash: imageHash,
        creator: parsed.creator,
        timestamp: Number(parsed.timestamp),
        title: parsed.title || '',
        tx_digest: event.id.txDigest
      };

      console.log(`   → Upserting: ${registration.cert_id.slice(0, 16)}...`);
      
      const { error } = await supabase
        .from('registrations')
        .upsert(registration, { onConflict: 'cert_id' });

      if (error) {
        console.error(`   ✗ Error:`, error.message);
      } else {
        console.log(`   ✓ Success`);
      }
    }
  } catch (error) {
    console.error('Error fetching registrations:', error);
  }

  // Query DisputeEvents
  console.log('\n⚠️  Fetching DisputeEvents...');
  try {
    const dispEvents = await sui.queryEvents({
      query: { MoveEventType: `${PACKAGE_ID}::registry::DisputeEvent` },
      limit: 100,
      order: 'ascending'
    });

    console.log(`   Found ${dispEvents.data.length} dispute events`);

    for (const event of dispEvents.data) {
      const parsed = event.parsedJson as any;
      
      const flaggedHash = Array.isArray(parsed.flagged_hash)
        ? bytesToHex(parsed.flagged_hash)
        : parsed.flagged_hash;

      const dispute = {
        dispute_id: extractId(parsed.dispute_id),
        original_cert_id: extractId(parsed.original_cert_id),
        flagged_hash: flaggedHash,
        flagger: parsed.flagger,
        similarity_score: Number(parsed.similarity_score),
        status: 0,
        timestamp: Number(parsed.timestamp)
      };

      console.log(`   → Upserting: ${dispute.dispute_id.slice(0, 16)}...`);
      
      const { error } = await supabase
        .from('disputes')
        .upsert(dispute, { onConflict: 'dispute_id' });

      if (error) {
        console.error(`   ✗ Error:`, error.message);
      } else {
        console.log(`   ✓ Success`);
      }
    }
  } catch (error) {
    console.error('Error fetching disputes:', error);
  }

  console.log('\n✅ Sync complete!');
  
  // Verify data in Supabase
  console.log('\n📊 Verifying Supabase data:');
  const { data: regs, count: regCount } = await supabase
    .from('registrations')
    .select('cert_id, image_hash, title', { count: 'exact' });
  console.log(`   Registrations: ${regCount || regs?.length || 0}`);
  if (regs && regs.length > 0) {
    regs.forEach(r => console.log(`   → ${r.title || 'Untitled'}: ${r.image_hash.slice(0, 16)}...`));
  }

  const { data: disps, count: dispCount } = await supabase
    .from('disputes')
    .select('dispute_id, similarity_score', { count: 'exact' });
  console.log(`   Disputes: ${dispCount || disps?.length || 0}`);
}

main().catch(console.error);
