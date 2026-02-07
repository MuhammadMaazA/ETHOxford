/**
 * Sui Event Indexer for Hatchmark
 * 
 * Polls Sui RPC for RegistrationEvent and DisputeEvent,
 * then inserts them into Supabase for fast querying.
 * 
 * Run with: npx ts-node scripts/indexer.ts
 * Or for production: node --loader ts-node/esm scripts/indexer.ts
 */

import { SuiClient, SuiEventFilter } from '@mysten/sui/client';
import { createClient } from '@supabase/supabase-js';

// Configuration
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443';
const POLL_INTERVAL_MS = 10000; // 10 seconds

// Initialize clients
const sui = new SuiClient({ url: SUI_RPC_URL });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Track last processed event cursor for pagination
let lastRegistrationCursor: string | null = null;
let lastDisputeCursor: string | null = null;

// Helper to convert byte array to hex string
function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to safely extract ID from event data
function extractId(idField: any): string {
  if (typeof idField === 'string') return idField;
  if (idField?.id) return idField.id;
  if (idField?.bytes) return idField.bytes;
  return String(idField);
}

/**
 * Index RegistrationEvent from Sui blockchain
 */
async function indexRegistrationEvents(): Promise<void> {
  try {
    const filter: SuiEventFilter = {
      MoveEventType: `${PACKAGE_ID}::registry::RegistrationEvent`
    };

    const events = await sui.queryEvents({
      query: filter,
      cursor: lastRegistrationCursor,
      limit: 50,
      order: 'ascending'
    });

    if (events.data.length === 0) {
      return;
    }

    console.log(`[Indexer] Found ${events.data.length} new RegistrationEvents`);

    for (const event of events.data) {
      const parsed = event.parsedJson as any;
      
      // Convert image_hash from byte array to hex string
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

      const { error } = await supabase
        .from('registrations')
        .upsert(registration, { onConflict: 'cert_id' });

      if (error) {
        console.error(`[Indexer] Error upserting registration:`, error);
      } else {
        console.log(`[Indexer] Indexed registration: ${registration.cert_id.slice(0, 16)}...`);
      }
    }

    // Update cursor for next poll
    if (events.hasNextPage && events.nextCursor) {
      lastRegistrationCursor = events.nextCursor;
    }
  } catch (error) {
    console.error('[Indexer] Error querying RegistrationEvents:', error);
  }
}

/**
 * Index DisputeEvent from Sui blockchain
 */
async function indexDisputeEvents(): Promise<void> {
  try {
    const filter: SuiEventFilter = {
      MoveEventType: `${PACKAGE_ID}::registry::DisputeEvent`
    };

    const events = await sui.queryEvents({
      query: filter,
      cursor: lastDisputeCursor,
      limit: 50,
      order: 'ascending'
    });

    if (events.data.length === 0) {
      return;
    }

    console.log(`[Indexer] Found ${events.data.length} new DisputeEvents`);

    for (const event of events.data) {
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
        status: 0, // open
        timestamp: Number(parsed.timestamp)
      };

      const { error } = await supabase
        .from('disputes')
        .upsert(dispute, { onConflict: 'dispute_id' });

      if (error) {
        console.error(`[Indexer] Error upserting dispute:`, error);
      } else {
        console.log(`[Indexer] Indexed dispute: ${dispute.dispute_id.slice(0, 16)}...`);
      }
    }

    if (events.hasNextPage && events.nextCursor) {
      lastDisputeCursor = events.nextCursor;
    }
  } catch (error) {
    console.error('[Indexer] Error querying DisputeEvents:', error);
  }
}

/**
 * Main polling loop
 */
async function startIndexer(): Promise<void> {
  console.log('========================================');
  console.log('🔍 Hatchmark Event Indexer Starting...');
  console.log(`📦 Package ID: ${PACKAGE_ID}`);
  console.log(`🔗 Sui RPC: ${SUI_RPC_URL}`);
  console.log(`💾 Supabase: ${SUPABASE_URL}`);
  console.log(`⏱️  Poll Interval: ${POLL_INTERVAL_MS}ms`);
  console.log('========================================\n');

  // Initial poll
  await indexRegistrationEvents();
  await indexDisputeEvents();

  // Start polling loop
  setInterval(async () => {
    await indexRegistrationEvents();
    await indexDisputeEvents();
  }, POLL_INTERVAL_MS);
}

// Run if called directly
startIndexer().catch(console.error);
