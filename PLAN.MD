# Hatchmark × Sui — Final 36-Hour Plan

## Project Summary

**Hatchmark** is a blockchain-powered content authenticity platform that lets creators register image ownership on-chain (Sui) and flag unauthorized reuse using perceptual hashing — enabling **trustless, timestamped copyright protection**.

**Tracks:** New Consumer Primitives (Main) + Sui (Sponsor)

**V1 Scope:** Perceptual hash registration + verification + dispute flagging

**V2 Roadmap:** Zero-knowledge ownership proofs (mentioned in pitch, not implemented)

---

## Core Concept

1. Creator uploads image → **perceptual hash** computed off-chain
2. Hash committed to **Sui blockchain** as owned object — timestamped, immutable
3. Anyone can verify suspect images → hash compared against indexed registry
4. Flagged content creates on-chain dispute object for transparent resolution
5. **(V2)** ZK proofs allow ownership claims without revealing original image

**Market Positioning:** A new consumer primitive for the "Provenance Economy" — just as social media created the Attention Economy and blockchains enabled token launchpads, Hatchmark creates trustless content ownership verification in the AI age.

---

## Architecture

### On-Chain (Sui Move)

| Component | Purpose |
| --- | --- |
| **ContentRegistry** | Module for registering hashes as owned Sui objects |
| **RegistrationCertificate** | Sui object: perceptual hash + timestamp + metadata |
| **DisputeModule** | Creates dispute objects when matches are flagged |
| **StakingPool** (optional) | Shared object for dispute staking mechanism |
| **Events** | Emit registration events for off-chain indexing |

### Off-Chain Services

| Component | Purpose |
| --- | --- |
| **Hash Indexer** | Supabase (PostgreSQL) indexing hash → cert_id from Sui events |
| **Hashing Service** | Client-side JavaScript (imghash/phash-js) OR standalone Python API |
| **API Layer** | Next.js API routes: register, verify, flag |
| **Event Listener** | Supabase Edge Functions or simple polling script |

### Frontend (Next.js + TypeScript)

| Page | Function |
| --- | --- |
| **Register** | Upload → hash → mint certificate → show confirmation |
| **Verify** | Upload suspect image → check against indexed registry |
| **Dispute** | View/create dispute objects for matches |
| **Dashboard** | View your certificates + active disputes |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Blockchain** | Sui Testnet (Move language) |
| **Hashing** | Client-side: imghash or phash-js (browser-based pHash) OR Standalone Python service on Railway/Render  |
| **Database** | Supabase (managed PostgreSQL + real-time) |
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **Wallet** | @mysten/dapp-kit (Sui wallet adapter) |
| **Deployment** | Vercel (frontend + API), Supabase (indexer) |

---

## Smart Contract Design (Sui Move)

### Key Objects

**RegistrationCertificate** (owned by creator)

- `id: UID`
- `image_hash:`  u64— 8-byte perceptual hash
- `creator: address`
- `timestamp: u64`
- `title: String`
- `description: String`

**Dispute** (shared object, created when flagged)

- `id: UID`
- `original_cert_id: ID`
- `flagged_hash:` u64
- `flagger: address`
- `status: u8` — 0=open, 1=valid, 2=invalid
- `timestamp: u64`
- NOTE: Similarity computed off-chain, not stored on-chain

**StakingPool** (optional - for DeFi track)

- `id: UID`
- `balance: Balance<SUI>`
- Flaggers stake 10 SUI per dispute
- Resolved disputes distribute stake based on outcome

**Events** (for off-chain indexing)

- `RegistrationEvent` — emitted on register
- `DisputeEvent` — emitted on flag

### Key Functions

- `register(hash: u64, title, description, clock)` → Mint certificate, emit event, transfer to sender
- `flag_content(original_cert_id, flagged_hash: u64, clock: &Clock)` → Create shared dispute object
- `resolve_dispute(dispute: &mut Dispute, cert, resolution)` → Only original creator can mutate dispute status
- `flag_with_stake(original_cert_id, flagged_hash, pool, payment, clock)` → Stake-based dispute (optional for DeFi track)
- `resolve_with_payout(dispute: &mut Dispute, pool: &mut StakingPool, cert, resolution)` → Resolve + distribute stake (optional for DeFi track)

---

## Off-Chain Architecture

### Database Schema

**registrations** table:

- `cert_id` (PK), `image_hash`, `creator`, `timestamp`, `title`, `description`, `tx_digest`
- Index on `image_hash` for fast lookups

**disputes** table:

- `dispute_id` (PK), `original_cert_id` (FK), `flagged_hash`, `flagger`, `derived_similarity`, `status`, `timestamp`

### Event Indexer Options

**Option A (Recommended): Supabase**

- Use Supabase Database Webhooks or Edge Functions
- Listen to Sui events via RPC polling
- Auto-insert into PostgreSQL tables
- No server management required

**Option B (Fallback): Custom Node.js**

- Poll Sui RPC for `RegistrationEvent` and `DisputeEvent` every 5 seconds
- Insert into PostgreSQL with `ON CONFLICT DO NOTHING`
- Deploy to Railway/Render

**Choose Option A to save 2 hours**

### API Routes

**`/api/hash`** — POST: Upload image → return perceptual hash. 
Hashes are represented as `u64` on-chain; the frontend/API uses a single canonical encoding (hex or decimal) to avoid mismatches.

**`/api/verify`** — POST: Hash → query DB → compute Hamming distance → return matches >90% similarity

**`/api/register`** — POST: Build unsigned transaction for wallet to sign

**`/api/flag`** — POST: Build unsigned dispute transaction

---

## Frontend Flow

### Register Page

1. User uploads image
2. Compute perceptual hash via `/api/hash`
3. Display hash + preview
4. User enters title, connects Sui wallet
5. Sign transaction via `@mysten/dapp-kit`
6. Show success confirmation + certificate ID

### Verify Page

1. User uploads suspect image
2. Compute hash via `/api/hash`
3. Query `/api/verify` for matches
4. Display results:
    - **No matches:** Green checkmark
    - **Matches found:** Red alert with similarity %, original cert details, "Flag" button

### Dispute Page

1. List all disputes involving user (as creator or flagger)
2. Show status: open, resolved valid, resolved invalid
3. Original creator can resolve disputes

### Dashboard

1. Query Sui RPC for user's owned `RegistrationCertificate` objects
2. Display as grid with thumbnails (if metadata includes IPFS links)
3. Show active dispute count per certificate

---

## ⚠️ PRE-START CRITICAL ACTION (Hour -1 to 0)

### **Verify Sui Prize Structure**

**Action Required:** Contact Sui sponsors immediately on Discord/Telegram:

> "Is the $10,000 Sui prize pool exclusively for CTF top-20 ($500 × 20), or is there a separate prize category for best dApp built on Sui?"
> 

### **Decision Tree:**

**If CTF-only:**

- **Option A:** Pivot to Flare blockchain (guaranteed $5k dApp prizes, use Solidity instead of Move)
- **Option B:** Build on Sui for Main Track differentiation + allocate 8-10h to CTF for $500 bonus

**If dApp prizes exist:**

- Proceed with current plan
- Allocate 4h to CTF as bonus opportunity

### **🚨 DO NOT START PHASE 1 UNTIL THIS IS CLARIFIED**

---

## 36-Hour Sprint Plan

### **Phase 1: Foundation (0-4h)** ⚙️

- [ ]  **[PRE-REQUISITE]** Verify Sui prize structure with sponsors (see above)
- [ ]  Install Sui CLI (`cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui`)
- [ ]  Create new Sui Move project (`sui move new hatchmark`)
- [ ]  Complete **Sui Object Model Workshop** (required for Sui track qualification)
- [ ]  Scaffold Next.js app with TypeScript + Tailwind (`npx create-next-app@latest`)
- [ ]  Install `@mysten/dapp-kit`, `@mysten/sui.js`
- [ ]  Set up Python environment (install `Pillow`, `imagehash`)
- [ ]  Initialize Supabase project (free tier)

**Checkpoint:** Dev environment ready, workshop completed, can run `sui client`, Sui prize strategy confirmed

---

### **Phase 2: Smart Contracts (4-12h)** 📜

- [ ]  Define `RegistrationCertificate` struct with all fields
- [ ]  Define `Dispute` struct with all fields
- [ ]  Define `RegistrationEvent` and `DisputeEvent`
- [ ]  Implement `register()` entry function
- [ ]  Implement `flag_content()` entry function
- [ ]  Implement `resolve_dispute()` entry function
- [ ]  **[OPTIONAL - DeFi Track Hedge]** Add staking mechanism (if time permits):
    - Create `StakingPool` shared object
    - Implement `flag_with_stake()` requiring 10 SUI deposit
    - Implement `resolve_with_payout()` distributing stake based on outcome
    - **This qualifies for "Prediction Markets + DeFi" track**
- [ ]  Write basic Move tests (`sui move test`)
- [ ]  Deploy to Sui Testnet using hackathon faucet (`sui@oxford2026`)
- [ ]  Save package ID and module addresses
- [ ]  Test via CLI: register a hash, verify object created, check events with Sui Explorer

**Checkpoint:** Contracts deployed, can register/flag via CLI, events visible in explorer

**Time Note:** Add 2h if implementing staking (changes 4-10h to 4-12h)

---

### **Phase 3: Off-Chain Services (12-18h)** 🔧

- [ ]  **[OPTION A - RECOMMENDED]** Use client-side hashing library:
    - Install `imghash` or `phash-js` npm package
    - Compute hash in browser on file upload
    - No API route needed, no Python deployment issues
- [ ]  **[OPTION B - FALLBACK]** Deploy Python service separately:
    - Write `hash_image.py` using `imagehash.phash()`
    - Deploy to Railway/Render as standalone service
    - Next.js calls external hash service API
- [ ]  Set up Supabase PostgreSQL schema (registrations + disputes tables)
- [ ]  Set up event indexer:
    - **Recommended:** Supabase Edge Function polling Sui RPC every 5s
    - **Fallback:** Node.js script on Railway/Render
- [ ]  Build `/api/verify` route:
    - Query all hashes from Supabase
    - Compute Hamming distance for each
    - Return matches with similarity >90%
- [ ]  Build `/api/register` route — construct unsigned `TransactionBlock`
- [ ]  Build `/api/flag` route — construct unsigned dispute transaction
- [ ]  Test full flow: upload → hash → register → indexer picks up event → verify finds match

**Checkpoint:** Backend operational, can hash/verify/register via API, indexer syncing

---

### **Phase 4: Frontend (18-26h)** 🎨

- [ ]  Set up Sui wallet provider with `@mysten/dapp-kit`
- [ ]  Build **Register page**:
    - Image upload with drag-and-drop
    - Display computed hash
    - Title/description inputs
    - Wallet connection button
    - Transaction signing + confirmation
- [ ]  Build **Verify page**:
    - Image upload
    - Loading state while checking
    - Match results with similarity percentage
    - Link to original certificate
    - "Flag as stolen" button if match found
- [ ]  Build **Dashboard page**:
    - Query owned objects using `client.getOwnedObjects()`
    - Display certificates in grid
    - Show dispute count per certificate
- [ ]  Build **Dispute page**:
    - List disputes (query by flagger or original_cert_id)
    - Show resolution status
    - Resolve button for creators
- [ ]  Polish UI:
    - Tailwind styling for clean, modern look
    - Loading states, error handling
    - Mobile responsive
    - Success/error toasts
- [ ]  **[OPTIONAL]** Implement `DEMO_MODE` environment variable:
    - Pre-seed 3 demo images with computed hashes
    - Fallback data if live blockchain/indexer fails during demo

**Checkpoint:** Full dApp functional, all pages connected, wallet integration working

---

### **Phase 5: Sui CTF Challenges (26-30h)** 🎯

**Time Allocation Decision:**

- **If Sui has dApp prizes:** Allocate 4h to CTF (stretch goal)
- **If Sui is CTF-only:** Allocate 8-10h to CTF (primary Sui strategy)

**Tasks:**

- [ ]  Clone Sui CTF repository from hackathon materials
- [ ]  Attempt challenges (target 5-10 flags minimum)
- [ ]  Focus on challenges matching your skillset:
    - Object ownership puzzles
    - Move security challenges
    - Transaction building tasks
- [ ]  Document solutions in `/ctf-solutions` folder
- [ ]  Submit flag captures for top-20 bonus ($500)

**Checkpoint:** Multiple flags captured, documented solutions

**Fallback:** If behind schedule, skip CTF and focus on polishing demo for Main Track

---

### **Phase 6: Demo Preparation (30-34h)** 🎬

- [ ]  Deploy frontend to Vercel (connect GitHub repo)
- [ ]  Deploy event indexer (Supabase Edge Function already deployed, or Railway/Render if custom)
- [ ]  Configure environment variables (DATABASE_URL, SUPABASE_KEY, PACKAGE_ID, etc.)
- [ ]  Test deployed app end-to-end
- [ ]  Prepare demo dataset:
    - Register 3-5 sample images
    - Create tampered versions (crop, resize, compress)
    - Test verification shows matches with 90%+ similarity
- [ ]  Record **pitch video** (2-3 minutes):
    - **Problem** (20s): No trustless content timestamps, AI makes plagiarism easy
    - **Solution** (30s): Blockchain registry + perceptual hashing creating a new "Provenance Economy" primitive
    - **Demo** (60s): Live walkthrough of register → verify → flag flow
    - **Why Blockchain** (15s): Trustless, immutable, creator-owned, globally accessible
    - **Roadmap** (15s): V2 adds ZK proofs for privacy-preserving disputes
- [ ]  Edit video (clean transitions, screen recordings, voiceover)

**Checkpoint:** Deployed app live, pitch video recorded and edited

---

### **Phase 7: Documentation & Submission (34-36h)** 📝

- [ ]  Write comprehensive README:
    - Project description (2-3 paragraphs emphasizing "new consumer primitive")
    - Architecture diagram (use Excalidraw or draw.io)
    - Tech stack breakdown
    - Setup instructions (clone, install, configure, run)
    - **Sui development feedback** (required for sponsor track — be specific about what worked well and what was challenging)
    - Known limitations (similarity threshold needs tuning, V2 for ZK)
    - Future roadmap
- [ ]  Clean up code:
    - Remove commented code, debug logs
    - Add inline comments for complex logic
    - Ensure consistent formatting
- [ ]  Create demo video screenshots for README
- [ ]  Upload pitch video to YouTube (unlisted)
- [ ]  Submit to **DoraHacks**:
    - **Main Track:** New Consumer Primitives (primary)
    - **Main Track:** Prediction Markets + DeFi (if staking implemented)
    - **Sponsor Track:** Sui
- [ ]  Double-check all required fields filled
- [ ]  Submit CTF solutions separately if applicable

**Checkpoint:** Submitted on DoraHacks with all required materials

---

## Pitch Video Script (2:30)

**[0:00-0:20] Problem**

> "AI can now generate photorealistic images in seconds. Artists and photographers have no trustless way to prove they created something first. Copyright disputes rely on centralized platforms making arbitrary decisions."
> 

**[0:20-0:50] Solution**

> "Hatchmark uses perceptual hashing to create a cryptographic fingerprint of your image and registers it on the Sui blockchain with an immutable timestamp. Anyone can verify if content matches a previously registered work. We're creating a new consumer primitive for content authenticity — the Provenance Economy."
> 

**[0:50-1:50] Demo**

> [Screen recording]
> 
> 1. "Here's an original photo. I upload it, and Hatchmark computes a perceptual hash."
> 2. "I connect my Sui wallet and register it on-chain. Now it's timestamped forever."
> 3. "Someone crops and compresses my photo. When verified, Hatchmark shows a 94% match to my original registration."
> 4. "I can flag this as stolen content, creating an on-chain dispute linked to my original certificate."
> 5. "My dashboard shows all my protected works and any active disputes."

**[1:50-2:10] Why Blockchain**

> "Traditional copyright systems are slow, expensive, and centralized. Hatchmark provides instant, trustless timestamps that no platform can delete or modify. Your proof is globally accessible and creator-owned. It's a new primitive for the creator economy."
> 

**[2:10-2:30] Roadmap**

> "This is V1 — proving the concept works. V2 will add zero-knowledge proofs, allowing creators to prove ownership in disputes without revealing their original work publicly. We're building the foundation for privacy-preserving copyright protection in the age of AI."
> 

---

## Submission Checklist

### Required Materials

- [ ]  **Pitch video** — YouTube link, 2-3 minutes
- [ ]  **GitHub repository** — public, clean code
- [ ]  **Live demo** — Vercel deployment URL
- [ ]  **Smart contracts** — deployed to Sui Testnet, package ID documented

### README Must Include

- [ ]  Project description (emphasize "new consumer primitive")
- [ ]  Architecture diagram
- [ ]  Tech stack list
- [ ]  Setup/installation instructions
- [ ]  **Feedback on Sui development** (required for sponsor track)
- [ ]  Known limitations and V2 roadmap
- [ ]  Team members (if applicable)

### DoraHacks Submissions

- [ ]  **Main Track:** New Consumer Primitives (primary submission)
- [ ]  **Main Track:** Prediction Markets + DeFi (if staking implemented)
- [ ]  **Sponsor Track:** Sui
- [ ]  Optional: CTF solutions

---

## Risk Mitigation

| Risk | Mitigation Strategy |
| --- | --- |
| **Sui prize structure unclear** | Verify with sponsors in Hour 0, pivot to Flare if needed |
| **Sui testnet downtime** | Test early, have backup demo video with pre-recorded transactions |
| **Event indexer lag** | Use Supabase managed service, keep local fallback DB |
| **Python subprocess slow** | Cache results, pre-compute hashes for demo images |
| **Wallet connection issues** | Test on Chrome, Firefox, Brave — have backup wallet funded |
| **Time overrun on CTF** | Skip CTF if behind schedule, prioritize core demo |
| **Perceptual hash edge cases** | Acknowledge in pitch, focus on 90%+ matches for demo |
| **Demo failure during pitch** | Implement DEMO_MODE with pre-seeded data as failsafe |

---

## Success Criteria

### Minimum Viable Submission ✅

- Working registration flow on Sui
- Perceptual hash verification with similarity scores
- Clean, demo-ready UI
- 2-minute pitch video explaining concept
- All DoraHacks fields completed

### Stretch Goals 🎯

- Staking mechanism implemented (DeFi track eligibility)
- 5+ Sui CTF flags captured ($500 bonus potential)
- Batch registration feature (register 10 images in one transaction)
- Chrome extension for auto-verification on any webpage
- Public gallery of registered works

### Competitive Position

- **New Consumer Primitives Track:** High probability (perfect fit, novel use case, working prototype)
- **DeFi Track:** Medium probability (if staking implemented with economic model)
- **Sui Track:** Medium-high probability (depends on prize structure + CTF performance)
- **Main $10k Prize:** Competitive with 2-3 track submissions

---

## Final Notes

**This plan is achievable with critical fixes applied:**

1. ✅ **Track corrected** — "New Consumer Primitives" is the right fit
2. ✅ **Sui verification required** — Don't start until prize structure confirmed
3. ✅ **Multi-track hedge** — Optional staking adds DeFi eligibility
4. ✅ **Simplified indexer** — Supabase saves 2h vs custom deployment
5. ✅ **Demo failsafe** — DEMO_MODE as insurance against live failures

**Key to success:**

1. **Verify Sui prizes FIRST** (Hour 0 blocker)
2. **Don't skip the Sui workshop** — required for track qualification
3. **Start the indexer early** — event syncing is critical
4. **Test wallet integration thoroughly** — most common failure point
5. **Be honest about V2** — judges respect roadmaps over overpromising

**Execute methodically. Ship working code. You've got this.**

---

## AI Content Detection Integration Plan (Sightengine)

### Overview

Integrate Sightengine AI detection to analyze uploaded images for AI-generated content, deepfakes, and manipulation. Display results on both Register and Verify pages to help users assess content authenticity before blockchain registration.

### Why Sightengine?

- **AI Detection:** Detects AI-generated images (Midjourney, DALL-E, Stable Diffusion, etc.)
- **Deepfake Detection:** Identifies face swaps and synthetic media
- **Image Quality Analysis:** Detects compression artifacts, manipulation, etc.
- **Fast API Response:** <2 seconds per image
- **Free Tier:** 2,000 operations/month (perfect for MVP)

---

### Architecture Changes

#### 1. Environment Configuration

**New Environment Variables (.env.local)**
```env
# Sightengine AI Detection
SIGHTENGINE_API_USER=your_api_user
SIGHTENGINE_API_SECRET=your_api_secret
NEXT_PUBLIC_ENABLE_AI_DETECTION=true
```

#### 2. Frontend Components

**New Component: AIDetectionBadge.tsx**
```tsx
components/AIDetectionBadge.tsx
├── Display AI probability score (0-100%)
├── Color-coded badge (red: high AI, yellow: medium, green: low)
├── Detailed breakdown modal (optional)
└── Loading/error states
```

**Features:**
- Visual indicator with percentage
- Tooltip with explanation
- Click to expand details (AI model detected, confidence breakdown)
- Dismissible information modal

#### 3. Backend API Routes

**New API Endpoint: /api/ai-detect**
```typescript
app/api/ai-detect/route.ts
├── Accept base64 image or upload URL
├── Call Sightengine API
├── Cache results (optional - 24h TTL)
├── Return normalized response
└── Handle errors gracefully
```

**Sightengine API Call Structure:**
```typescript
POST https://api.sightengine.com/1.0/check.json
{
  workflow: "wfl_XXX",  // AI detection workflow
  models: "ai-generated,deepfake,quality",
  api_user: "XXX",
  api_secret: "XXX",
  media: base64_image OR url
}
```

**Response Format (Normalized):**
```typescript
interface AIDetectionResult {
  isAIGenerated: boolean;
  confidence: number; // 0-100
  aiProbability: number; // 0-1
  deepfakeProbability: number; // 0-1
  qualityScore: number; // 0-1
  detectedModels?: string[]; // ["stable-diffusion", "midjourney", etc.]
  manipulationDetected: boolean;
  processingTime: number;
  error?: string;
}
```

#### 4. Database Schema Updates (Supabase)

**Extend registrations table:**
```sql
ALTER TABLE registrations
ADD COLUMN ai_detection_score FLOAT,
ADD COLUMN ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN deepfake_score FLOAT,
ADD COLUMN quality_score FLOAT,
ADD COLUMN detection_metadata JSONB;
```

**Extend disputes table:**
```sql
ALTER TABLE disputes
ADD COLUMN flagged_image_ai_score FLOAT,
ADD COLUMN flagged_image_ai_generated BOOLEAN;
```

#### 5. Integration Points

**Register Page Flow:**
```
1. User uploads image
   ↓
2. Compute perceptual hash (existing)
   ↓
3. Check for duplicates (existing)
   ↓
4. [NEW] Call AI detection API
   ↓
5. Display AI detection results
   ↓
6. User reviews and confirms registration
   ↓
7. Store AI metadata with registration
```

**Verify Page Flow:**
```
1. User uploads suspect image
   ↓
2. Compute perceptual hash (existing)
   ↓
3. [NEW] Call AI detection API (parallel)
   ↓
4. Find matches in database (existing)
   ↓
5. Display both:
   - Similarity matches (existing)
   - AI detection results (new)
   ↓
6. Enhanced decision-making context
```

---

### Implementation Steps

#### Phase 1: Setup & Configuration (30 mins)

- [ ] Sign up for Sightengine account (https://sightengine.com)
- [ ] Get API credentials (user + secret)
- [ ] Add environment variables to `.env.local`
- [ ] Install dependencies: None needed (using native fetch)

#### Phase 2: Backend API (1 hour)

- [ ] Create `/api/ai-detect/route.ts`
- [ ] Implement Sightengine API integration
- [ ] Add error handling and rate limiting
- [ ] Test with sample images
- [ ] Add response caching (optional)

**Code Structure:**
```typescript
// app/api/ai-detect/route.ts
export async function POST(request: Request) {
  const { imageBase64, imageUrl } = await request.json();
  
  const formData = new FormData();
  formData.append('models', 'ai-generated,deepfake,quality');
  formData.append('api_user', process.env.SIGHTENGINE_API_USER!);
  formData.append('api_secret', process.env.SIGHTENGINE_API_SECRET!);
  
  if (imageBase64) {
    formData.append('media', imageBase64);
  } else if (imageUrl) {
    formData.append('media', imageUrl);
  }
  
  const response = await fetch('https://api.sightengine.com/1.0/check.json', {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  
  return Response.json({
    isAIGenerated: data.type.ai_generated > 0.5,
    confidence: Math.round(data.type.ai_generated * 100),
    aiProbability: data.type.ai_generated,
    deepfakeProbability: data.deepfake?.confidence || 0,
    qualityScore: data.quality?.score || 1,
    processingTime: data.time,
  });
}
```

#### Phase 3: UI Components (1.5 hours)

- [ ] Create `AIDetectionBadge.tsx` component
- [ ] Create `AIDetectionModal.tsx` for detailed view
- [ ] Add loading states and skeletons
- [ ] Style with Tailwind CSS (match existing theme)

**Component Features:**
```tsx
<AIDetectionBadge 
  score={75} 
  isAIGenerated={true}
  showDetails={true}
  onDetailsClick={() => setShowModal(true)}
/>
// Renders:
// 🤖 AI-Generated: 75% [ℹ️ Details]
```

#### Phase 4: Register Page Integration (1 hour)

- [ ] Import AI detection components
- [ ] Call API after image upload
- [ ] Display results below duplicate check
- [ ] Store AI metadata in registration payload
- [ ] Update Supabase insertion

**UI Layout:**
```
┌─────────────────────────────────────┐
│  Image Upload Zone                  │
│  [Drag & Drop or Click]             │
└─────────────────────────────────────┘
         ↓ (after upload)
┌─────────────────────────────────────┐
│  ✓ Hash: abc123...                  │
│  ✓ Original - No duplicates         │
│  🤖 AI Detection: 12% (Likely Real) │ ← NEW
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  Title: [________________]          │
│  Description: [__________]          │
│  [Register on Blockchain]           │
└─────────────────────────────────────┘
```

#### Phase 5: Verify Page Integration (1 hour)

- [ ] Import AI detection components
- [ ] Call API parallel to hash verification
- [ ] Display AI results above/below matches
- [ ] Add AI filter to match results (optional)

**UI Layout:**
```
┌─────────────────────────────────────┐
│  Upload Image to Verify             │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  🤖 AI Analysis                      │ ← NEW
│  • AI-Generated: 85% (High)         │
│  • Likely Model: Stable Diffusion   │
│  • Quality: Compressed              │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  🔍 Similarity Matches               │
│  • Original by alice.sui (94%)      │
│  • Registered: 2 days ago           │
└─────────────────────────────────────┘
```

#### Phase 6: Database Integration (30 mins)

- [ ] Run SQL migrations on Supabase
- [ ] Update registration API to store AI data
- [ ] Update verify API to return AI scores
- [ ] Test data persistence

#### Phase 7: Testing & Polish (1 hour)

- [ ] Test with real AI images (Midjourney, DALL-E)
- [ ] Test with real photos
- [ ] Test with screenshots/manipulated images
- [ ] Verify error handling (API down, rate limit)
- [ ] Add loading states and transitions
- [ ] Mobile responsive check

---

### User Experience Flow

**Scenario 1: Registering Real Photo**
```
1. Upload photo → Hash computed ✓
2. AI Detection: 5% (Likely Real) 🟢
3. User feels confident → Registers
4. On-chain registration includes AI score
```

**Scenario 2: Someone Tries to Register AI Art**
```
1. Upload AI image → Hash computed ✓
2. AI Detection: 95% (AI-Generated) 🔴
3. Warning: "This appears to be AI-generated"
4. User can still register (their choice)
5. Future verifiers see AI score
```

**Scenario 3: Verifying Stolen Content**
```
1. Upload suspect image
2. AI Detection: 15% (Likely Real) 🟢
3. Similarity Match: 94% to existing registration
4. Both data points inform decision:
   - High similarity = likely stolen
   - Low AI score = confirms authenticity
```

**Scenario 4: Detecting AI Rip-off**
```
1. Upload AI-generated copy
2. AI Detection: 92% (AI-Generated) 🔴
3. Similarity Match: 78% to real photo
4. User realizes: someone AI-copied my work
5. Can flag with additional AI evidence
```

---

### Code Examples

**Complete Register Page Integration:**
```tsx
// app/register/page.tsx additions

const [aiDetection, setAiDetection] = useState<AIDetectionResult | null>(null);
const [isDetecting, setIsDetecting] = useState(false);

const detectAI = async (file: File) => {
  setIsDetecting(true);
  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result?.toString().split(',')[1];
      const res = await fetch('/api/ai-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await res.json();
      setAiDetection(data);
      
      if (data.isAIGenerated && data.confidence > 70) {
        toast.warning('This image appears to be AI-generated');
      }
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('AI detection failed:', error);
    setAiDetection(null); // Graceful fallback
  } finally {
    setIsDetecting(false);
  }
};

// Modify onDrop to include AI detection
const onDrop = useCallback(async (acceptedFiles: File[]) => {
  const file = acceptedFiles[0];
  if (!file) return;

  setDuplicateInfo(null);
  setAiDetection(null);
  
  const preview = URL.createObjectURL(file);
  setImagePreview(preview);

  const hash = await computeHash(file);
  setImageHash(hash);
  
  // Run in parallel
  await Promise.all([
    checkDuplicate(hash),
    detectAI(file) // NEW
  ]);
}, [computeHash, checkDuplicate, detectAI]);

// Add to registration payload
const handleRegister = async () => {
  // ... existing checks ...
  
  const registrationData = {
    cert_id,
    image_hash: imageHash,
    creator: account.address,
    timestamp: Date.now(),
    title,
    description,
    tx_digest: digest,
    ai_detection_score: aiDetection?.confidence || null,
    ai_generated: aiDetection?.isAIGenerated || false,
    deepfake_score: aiDetection?.deepfakeProbability || null,
    quality_score: aiDetection?.qualityScore || null,
    detection_metadata: aiDetection || null,
  };
  
  // Store to Supabase...
};
```

**AI Detection Badge Component:**
```tsx
// components/AIDetectionBadge.tsx

interface AIDetectionBadgeProps {
  score: number; // 0-100
  isAIGenerated: boolean;
  isLoading?: boolean;
  showDetails?: boolean;
}

export function AIDetectionBadge({ 
  score, 
  isAIGenerated, 
  isLoading,
  showDetails = false 
}: AIDetectionBadgeProps) {
  const getBadgeColor = () => {
    if (score < 30) return 'bg-green-100 text-green-800 border-green-300';
    if (score < 70) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getLabel = () => {
    if (score < 30) return 'Likely Real';
    if (score < 70) return 'Uncertain';
    return 'AI-Generated';
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        Analyzing image...
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getBadgeColor()}`}>
      <span className="text-lg">🤖</span>
      <span className="font-medium">AI Detection: {score}%</span>
      <span className="text-xs opacity-75">({getLabel()})</span>
      {showDetails && (
        <button className="ml-1 text-xs underline">
          Details
        </button>
      )}
    </div>
  );
}
```

---

### API Rate Limits & Costs

**Sightengine Free Tier:**
- 2,000 operations/month
- Good for MVP and demo
- Upgrade to $49/month for 20,000 operations

**Optimization Strategies:**
1. Cache results for 24 hours (same hash = same result)
2. Only run detection when user clicks "Analyze" button (opt-in)
3. Skip detection for verification if hash already has AI data
4. Use Supabase Edge Functions for server-side caching

**Rate Limit Handling:**
```typescript
if (response.status === 429) {
  return Response.json({
    error: 'Rate limit exceeded',
    isAIGenerated: false,
    confidence: 0,
    note: 'AI detection temporarily unavailable'
  });
}
```

---

### Success Metrics

- [ ] AI detection runs in <3 seconds
- [ ] Graceful fallback if API fails
- [ ] Mobile-responsive UI
- [ ] Results displayed on both pages
- [ ] AI metadata stored in database
- [ ] 95%+ accuracy validated with test images

---

### Future Enhancements (V2)

1. **Batch Detection:** Analyze multiple images simultaneously
2. **Historical Trending:** Track AI generation trends over time
3. **Model Identification:** Display which AI model generated image
4. **Manipulation Timeline:** Show editing history if detectable
5. **ZK AI Proofs:** Prove image is real without revealing it
6. **Integration with Disputes:** Auto-flag high-AI-score duplicates
7. **API Webhooks:** Real-time detection on registration events

---

### Testing Checklist

**Test Cases:**
- [ ] Upload real photo (expect <20% AI score)
- [ ] Upload Midjourney image (expect >80% AI score)
- [ ] Upload DALL-E image (expect >80% AI score)
- [ ] Upload screenshot (expect moderate score)
- [ ] Upload heavily edited photo (check manipulation flag)
- [ ] Test with no API keys (verify graceful fallback)
- [ ] Test with rate limit exceeded (verify error handling)
- [ ] Test on slow connection (verify loading states)
- [ ] Verify data persisted to Supabase
- [ ] Mobile UI responsiveness

**Sample Images for Testing:**
```
/public/test-images/
├── real-photo.jpg          (Expected: <20%)
├── midjourney-ai.png       (Expected: >85%)
├── dalle-ai.webp           (Expected: >85%)
├── photoshop-edit.jpg      (Expected: 40-60%)
└── screenshot.png          (Expected: 30-50%)
```

---

### Timeline Estimate

| Phase | Time | Cumulative |
|-------|------|------------|
| Setup & Config | 30 min | 0:30 |
| Backend API | 1 hour | 1:30 |
| UI Components | 1.5 hours | 3:00 |
| Register Integration | 1 hour | 4:00 |
| Verify Integration | 1 hour | 5:00 |
| Database Updates | 30 min | 5:30 |
| Testing & Polish | 1 hour | 6:30 |

**Total: ~6.5 hours** (achievable in 1 day with focus)

---

### Risk Mitigation

| Risk | Solution |
|------|----------|
| API outage | Graceful fallback, continue without AI data |
| Rate limit hit | Cache aggressively, add manual "Analyze" button |
| False positives | Display as "suggestion", not blocker |
| Slow response | Show loading state, timeout after 10s |
| Cost concerns | Monitor usage, optimize before scale |

---

**END OF AI DETECTION INTEGRATION PLAN**