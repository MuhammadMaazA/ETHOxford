/**
 * Quick sync script - uses native fetch for simplicity
 * Run with: node scripts/sync-fetch.mjs
 *
 * Requires environment variables in .env.local:
 * - NEXT_PUBLIC_PACKAGE_ID
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_KEY
 */

import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const [key, ...valueParts] = line.split('=');
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const PACKAGE_ID = envVars.NEXT_PUBLIC_PACKAGE_ID || '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';
const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_KEY;
const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing required environment variables!');
  console.error('Please create .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

function bytesToHex(bytes) {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function extractId(idField) {
  if (typeof idField === 'string') return idField;
  if (idField?.id) return idField.id;
  if (idField?.bytes) return idField.bytes;
  return String(idField);
}

async function queryEvents(eventType, cursor = null) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'suix_queryEvents',
    params: [
      { MoveEventType: `${PACKAGE_ID}::registry::${eventType}` },
      cursor,
      100,
      true // ascending
    ]
  };

  const response = await fetch(SUI_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  return await response.json();
}

async function upsertSupabase(table, data) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${text}`);
  }
  return response;
}

async function getSupabaseCount(table) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  
  const countHeader = response.headers.get('content-range');
  if (countHeader) {
    const parts = countHeader.split('/');
    return parseInt(parts[1]) || 0;
  }
  return 0;
}

async function main() {
  console.log('🔍 Syncing Hatchmark events from Sui to Supabase...\n');
  console.log(`Package ID: ${PACKAGE_ID}`);
  console.log(`Sui RPC: ${SUI_RPC_URL}`);
  console.log(`Supabase: ${SUPABASE_URL}\n`);

  // Fetch RegistrationEvents
  console.log('📝 Fetching RegistrationEvents...');
  try {
    const regResult = await queryEvents('RegistrationEvent');
    
    if (regResult.error) {
      console.error('   RPC Error:', regResult.error);
    } else {
      const events = regResult.result?.data || [];
      console.log(`   Found ${events.length} registration events`);

      for (const event of events) {
        const parsed = event.parsedJson;
        
        const imageHash = Array.isArray(parsed.image_hash) 
          ? bytesToHex(parsed.image_hash)
          : parsed.image_hash;

        const registration = {
          cert_id: extractId(parsed.cert_id),
          image_hash: imageHash,
          creator: parsed.creator,
          title: parsed.title || '',
          tx_digest: event.id.txDigest,
          registered_at: Number(parsed.timestamp)
        };

        console.log(`   → Upserting: ${registration.cert_id.slice(0, 20)}...`);
        
        try {
          await upsertSupabase('registrations', registration);
          console.log(`   ✓ Success`);
        } catch (e) {
          console.error(`   ✗ Error: ${e.message}`);
        }
      }
    }
  } catch (error) {
    console.error('   Network error:', error.message);
  }

  // Fetch DisputeEvents
  console.log('\n⚠️  Fetching DisputeEvents...');
  try {
    const dispResult = await queryEvents('DisputeEvent');
    
    if (dispResult.error) {
      console.error('   RPC Error:', dispResult.error);
    } else {
      const events = dispResult.result?.data || [];
      console.log(`   Found ${events.length} dispute events`);

      for (const event of events) {
        const parsed = event.parsedJson;
        
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
          event_time: Number(parsed.timestamp)
        };

        console.log(`   → Upserting: ${dispute.dispute_id.slice(0, 20)}...`);
        
        try {
          await upsertSupabase('disputes', dispute);
          console.log(`   ✓ Success`);
        } catch (e) {
          console.error(`   ✗ Error: ${e.message}`);
        }
      }
    }
  } catch (error) {
    console.error('   Network error:', error.message);
  }

  console.log('\n✅ Sync complete!');
  
  // Show final counts
  console.log('\n📊 Database counts:');
  try {
    const regCount = await getSupabaseCount('registrations');
    const dispCount = await getSupabaseCount('disputes');
    console.log(`   Registrations: ${regCount}`);
    console.log(`   Disputes: ${dispCount}`);
  } catch (e) {
    console.log(`   Could not get counts: ${e.message}`);
  }
}

main().catch(console.error);
