/**
 * /api/flag - Build an unsigned transaction for flagging content
 * 
 * POST body: { 
 *   originalCertId: string (Sui object ID),
 *   flaggedHash: string (hex),
 *   similarityScore: number (0-100)
 * }
 * 
 * Returns: { transaction: string (base64 encoded) }
 */

import { Transaction } from '@mysten/sui/transactions';
import { NextResponse } from 'next/server';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || 
  '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';
const SUI_CLOCK = '0x6'; // Sui system Clock object

/**
 * Convert hex string to byte array
 */
function hexToBytes(hex: string): number[] {
  const cleanHex = hex.replace(/^0x/, '');
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16));
  }
  return bytes;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { originalCertId, flaggedHash, similarityScore, hammingDistance } = body;

    // Validate inputs
    if (!originalCertId || typeof originalCertId !== 'string') {
      return NextResponse.json(
        { error: 'originalCertId is required (Sui object ID)' },
        { status: 400 }
      );
    }

    if (!flaggedHash || typeof flaggedHash !== 'string') {
      return NextResponse.json(
        { error: 'flaggedHash is required and must be a hex string' },
        { status: 400 }
      );
    }

    // Accept either hammingDistance (0-255, contract native) or similarityScore (0-100)
    // hammingDistance takes precedence if both provided
    let scoreForContract: number;
    if (typeof hammingDistance === 'number' && hammingDistance >= 0 && hammingDistance <= 255) {
      scoreForContract = Math.round(hammingDistance);
    } else if (typeof similarityScore === 'number' && similarityScore >= 0 && similarityScore <= 100) {
      // Convert percentage to hamming-like score: 100% similarity = 0 distance
      scoreForContract = Math.round((100 - similarityScore) * 2.55);
    } else {
      return NextResponse.json(
        { error: 'Either hammingDistance (0-255) or similarityScore (0-100) is required' },
        { status: 400 }
      );
    }

    // Convert hex hash to byte array
    const hashBytes = hexToBytes(flaggedHash);
    
    if (hashBytes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid hash format' },
        { status: 400 }
      );
    }

    // Build the transaction
    const tx = new Transaction();
    
    // Call hatchmark::registry::flag_content
    // Function signature: flag_content(cert: &RegistrationCertificate, flagged_hash, similarity_score, clock)
    tx.moveCall({
      target: `${PACKAGE_ID}::registry::flag_content`,
      arguments: [
        tx.object(originalCertId),                  // cert: &RegistrationCertificate
        tx.pure.vector('u8', hashBytes),            // flagged_hash: vector<u8>
        tx.pure.u8(scoreForContract),               // similarity_score: u8 (hamming distance)
        tx.object(SUI_CLOCK)                        // clock: &Clock
      ]
    });

    // Return transaction parameters for frontend to build and sign
    return NextResponse.json({
      success: true,
      transactionData: {
        target: `${PACKAGE_ID}::registry::flag_content`,
        arguments: {
          originalCertId,
          flaggedHash: hashBytes,
          hammingDistance: scoreForContract
        }
      },
      packageId: PACKAGE_ID,
      function: 'flag_content',
      inputs: {
        originalCertId,
        flaggedHash,
        hammingDistance: scoreForContract,
        similarityScore: similarityScore ?? (100 - scoreForContract / 2.55)
      },
      message: 'Dispute transaction parameters ready. Build and sign with your wallet on the frontend.'
    });

  } catch (error) {
    console.error('Flag transaction build error:', error);
    return NextResponse.json(
      { error: 'Failed to build transaction', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint for documentation
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/flag',
    method: 'POST',
    body: {
      originalCertId: 'string (Sui object ID of the original registration)',
      flaggedHash: 'string (hex-encoded hash of the flagged content)',
      hammingDistance: 'number (0-255, bit difference - lower = more similar) [preferred]',
      similarityScore: 'number (0-100, similarity percentage) [alternative]'
    },
    note: 'Provide either hammingDistance or similarityScore. hammingDistance takes precedence.',
    returns: {
      transaction: 'string (base64 encoded transaction to sign)'
    },
    description: 'Build an unsigned Sui transaction for flagging potentially stolen content'
  });
}
