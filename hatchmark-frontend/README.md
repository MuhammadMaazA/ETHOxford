# Hatchmark — Trustless Content Authenticity on Sui

<div align="center">
  <h3>A New Consumer Primitive for the Provenance Economy</h3>
  <p><em>Register. Verify. Protect.</em></p>
</div>

---

## What is Hatchmark?

**Hatchmark** is a blockchain-powered content authenticity platform that enables creators to register image ownership on-chain and flag unauthorized reuse — providing **trustless, timestamped copyright protection** in the age of AI-generated content.

In a world where AI can generate photorealistic images in seconds, creators need a way to prove they created something first. Traditional copyright systems are slow, expensive, and centralized. Hatchmark provides instant, trustless timestamps that no platform can delete or modify — a new consumer primitive for content ownership verification.

**Track:** New Consumer Primitives + Sui Sponsor Track

---

## How It Works

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│  1. REGISTER    │───▶│  2. ON-CHAIN     │───▶│  3. VERIFY         │
│  Upload image   │    │  Hash stored on  │    │  Check any image   │
│  Compute hash   │    │  Sui blockchain  │    │  against registry  │
│  Sign with wallet│    │  Timestamped     │    │  Flag if stolen    │
└─────────────────┘    └──────────────────┘    └────────────────────┘
```

1. **Creator uploads image** → Hash computed client-side
2. **Hash committed to Sui blockchain** → Timestamped, immutable RegistrationCertificate
3. **Anyone can verify** → Upload suspect image, compare against indexed registry
4. **Flag unauthorized use** → Creates on-chain Dispute object for transparent resolution

---

## Live Demo

**Smart Contract:** `0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe`

**Network:** Sui Testnet

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │   Register  │  │   Verify    │  │  Dashboard  │  │  Wallet  │ │
│  │   Page      │  │   Page      │  │   Page      │  │  Connect │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────┘ │
└────────────────────────────┬─────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Sui Blockchain│    │   Supabase    │    │  API Routes   │
│  (Move)        │    │   (PostgreSQL)│    │  (Next.js)    │
│                │    │               │    │               │
│ • register()   │◀──│ • Event Indexer│    │ • /api/verify │
│ • flag_content()│   │ • registrations│    │ • /api/register│
│ • resolve_dispute()││ • disputes    │    │ • /api/flag   │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Sui Testnet (Move language) |
| **Hashing** | Client-side MD5 (V2: perceptual hashing) |
| **Database** | Supabase (PostgreSQL) |
| **Indexer** | Node.js polling Sui RPC events |
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS |
| **Wallet** | @mysten/dapp-kit |
| **Deployment** | Vercel |

---

## Smart Contract

### Objects

**RegistrationCertificate** (owned by creator)
```move
public struct RegistrationCertificate has key, store {
    id: UID,
    image_hash: vector<u8>,   // Hash of the image
    creator: address,         // Who registered it
    timestamp: u64,           // When it was registered
    title: String,
    description: String,
}
```

**Dispute** (owned by flagger)
```move
public struct Dispute has key, store {
    id: UID,
    original_cert_id: ID,     // Certificate being disputed
    flagged_hash: vector<u8>, // Hash of the flagged content
    flagger: address,         // Who filed the dispute
    similarity_score: u8,     // Hamming distance (0-255)
    status: u8,               // 0=open, 1=valid, 2=invalid
    timestamp: u64,
}
```

### Entry Functions

- `register(hash, title, description, clock)` → Mint certificate
- `flag_content(cert, flagged_hash, similarity, clock)` → Create dispute
- `resolve_dispute(dispute, cert, resolution)` → Only creator can resolve

---

## Setup Instructions

### Prerequisites

- Node.js 22+
- Sui CLI (for contract development)
- Supabase account

### Frontend

```bash
cd hatchmark-frontend
npm install
cp .env.example .env.local
# Fill in your Supabase credentials and Package ID
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
NEXT_PUBLIC_PACKAGE_ID=0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe
NEXT_PUBLIC_SUI_NETWORK=testnet
```

### Database Schema

Run in Supabase SQL Editor:

```sql
CREATE TABLE registrations (
  cert_id TEXT PRIMARY KEY,
  image_hash TEXT NOT NULL,
  creator TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  title TEXT,
  description TEXT,
  tx_digest TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_image_hash ON registrations(image_hash);

CREATE TABLE disputes (
  dispute_id TEXT PRIMARY KEY,
  original_cert_id TEXT REFERENCES registrations(cert_id),
  flagged_hash TEXT NOT NULL,
  flagger TEXT NOT NULL,
  similarity_score INT,
  status INT DEFAULT 0,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Sui Development Feedback

### What Worked Well

1. **Object-Centric Model** — The owned object model maps perfectly to certificates. Each RegistrationCertificate is naturally owned by its creator, making access control trivial.

2. **Move Language** — Strong type safety caught several bugs at compile time. The struct definitions are clear and self-documenting.

3. **Event System** — Emitting events for off-chain indexing was straightforward. The `event::emit()` pattern is clean.

4. **Testnet Faucet** — Getting testnet SUI was easy via CLI (`sui client faucet`).

### Challenges Encountered

1. **SDK v2.x Breaking Changes** — The @mysten/sui package v2.x has significant breaking changes from v1.x. `SuiClient` moved to `SuiJsonRpcClient`, and `getFullnodeUrl` moved to `getJsonRpcFullnodeUrl`. Documentation often references v1.x patterns.

2. **TypeScript Types** — The dapp-kit v2.x requires a `network` property in network config that was not obvious from examples.

3. **Windows Development** — Building the Sui CLI on Windows required installing LLVM/Clang separately due to the `msm` crate compilation requirements.

### Suggestions

- More v2.x SDK migration guides
- Official Windows installation docs for Sui CLI
- Example projects using the latest SDK version

---

## Known Limitations

1. **MD5 vs Perceptual Hashing** — Current implementation uses MD5 which only detects exact copies. V2 will implement perceptual hashing (pHash) to detect cropped/resized/compressed copies.

2. **Similarity Threshold** — The 90% similarity threshold is hardcoded. V2 will make this configurable.

3. **No Image Storage** — Only hashes are stored. Original images must be kept by creators.

---

## Roadmap

### V1 (Current)
- ✅ Register image hashes on-chain
- ✅ Verify images against registry
- ✅ Flag/dispute mechanism
- ✅ Dashboard showing owned certificates

### V2 (Planned)
- Perceptual hashing for similarity detection
- Zero-knowledge ownership proofs
- Batch registration
- IPFS integration for metadata
- Dispute staking mechanism

---

## Team

Built for ETHOxford 2026 Hackathon

---

## License

MIT
