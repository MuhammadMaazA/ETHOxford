# Hatchmark Setup Guide

Complete setup instructions for running Hatchmark on a new device.

---

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **Git**
   - Download: https://git-scm.com/
   - Verify: `git --version`

3. **Rust & Cargo** (for Sui CLI)
   - Download: https://rustup.rs/
   - Verify: `cargo --version`

### Windows-Specific Requirements

4. **LLVM/Clang** (required for Sui CLI on Windows)
   - Download: https://github.com/llvm/llvm-project/releases
   - Install LLVM 15+ and add to PATH
   - Verify: `clang --version`

5. **Visual Studio Build Tools** (optional, for native modules)
   - Download: https://visualstudio.microsoft.com/downloads/
   - Select "Desktop development with C++" workload

---

## Step 1: Install Sui CLI

### Option A: Pre-built Binary (Recommended)
```bash
# Download from GitHub releases
# https://github.com/MystenLabs/sui/releases
# Extract sui.exe to a directory in your PATH
```

### Option B: Build from Source (15-20 minutes)
```bash
# Install Sui CLI from source (testnet branch)
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui

# Verify installation
sui --version
# Expected: sui 1.x.x-xxxxx
```

### Initialize Sui Wallet
```bash
# Create new wallet (follow prompts)
sui client

# Get testnet SUI tokens
sui client faucet

# Verify balance
sui client gas
```

---

## Step 2: Clone Repository

```bash
# Clone the repository
git clone https://github.com/MuhammadMaazA/ETHOxford.git
cd ETHOxford
```

---

## Step 3: Frontend Setup

### Install Dependencies

```bash
cd hatchmark-frontend
npm install
```

### Environment Configuration

Create `.env.local` file in `hatchmark-frontend/` directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# Sui Configuration
NEXT_PUBLIC_PACKAGE_ID=0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe
NEXT_PUBLIC_SUI_NETWORK=testnet

# Optional: HuggingFace AI Detection (fallback to heuristics if not set)
NEXT_PUBLIC_HUGGINGFACE_TOKEN=your_huggingface_token_here
```

**Get Supabase Keys:**
1. Go to https://supabase.com/dashboard
2. Select your project (or create new)
3. Go to Settings → API
4. Copy `URL`, `anon public` key, and `service_role` key

**Get HuggingFace Token (Optional):**
1. Go to https://huggingface.co/settings/tokens
2. Create new token (read access)
3. Add to `.env.local`

---

## Step 4: Database Setup (Supabase)

### Create Tables

1. Go to Supabase Dashboard → SQL Editor
2. Run the following SQL:

```sql
-- Registrations table
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
CREATE INDEX idx_creator ON registrations(creator);

-- Disputes table
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

CREATE INDEX idx_original_cert ON disputes(original_cert_id);
```

---

## Step 5: Run Development Server

```bash
# Make sure you're in hatchmark-frontend directory
cd hatchmark-frontend

# Start Next.js development server
npm run dev
```

The app will be available at:
- **http://localhost:3000** (or next available port)

---

## Step 6: Build for Production (Optional)

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

---

## Troubleshooting

### Port Already in Use
If port 3000 is in use, Next.js will automatically try 3001, 3002, etc.

To manually specify a port:
```bash
npm run dev -- -p 3001
```

### Sui CLI Build Errors
If Sui installation fails:
1. Ensure clang is installed and in PATH
2. Restart terminal to refresh PATH
3. Try pre-built binary instead

### Database Connection Issues
1. Verify Supabase URL and keys in `.env.local`
2. Check Supabase project is active (not paused)
3. Verify tables are created correctly

### Module Not Found Errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Verify TypeScript compilation
npm run build

# Check for type errors
npx tsc --noEmit
```

---

## Project Structure

```
ETHOxford/
├── sui-contracts/         # Sui Move smart contracts
│   └── hatchmark/
│       └── sources/
│           └── registry.move
├── hatchmark-frontend/    # Next.js frontend
│   ├── app/              # App router pages
│   │   ├── register/     # Image registration
│   │   ├── verify/       # Image verification
│   │   ├── dashboard/    # User dashboard
│   │   └── api/          # API routes
│   ├── lib/              # Utilities
│   │   ├── phash.ts      # Perceptual hashing (DCT-based)
│   │   └── ai-detection.ts  # AI detection
│   └── components/       # React components
├── backend/              # Indexer & backend services
└── SETUP.md             # This file
```

---

## Development Workflow

### 1. Register an Image
- Go to http://localhost:3000/register
- Connect Sui wallet
- Upload image
- Wait for duplicate check + AI detection
- Fill title/description
- Sign transaction

### 2. Verify an Image
- Go to http://localhost:3000/verify
- Upload image to check
- View similarity matches
- Flag duplicates if needed

### 3. View Dashboard
- Go to http://localhost:3000/dashboard
- See your registered certificates
- Click to view on Sui Explorer

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS |
| **Blockchain** | Sui Testnet (Move) |
| **Database** | Supabase (PostgreSQL) |
| **Hashing** | DCT-based Perceptual Hash (64-bit) |
| **AI Detection** | HuggingFace API + On-device Heuristics |
| **Wallet** | @mysten/dapp-kit |

---

## Key Features

✅ **Perceptual Hashing** - DCT-based algorithm detects screenshots, crops, edits (70%+ similarity)  
✅ **AI Detection** - HuggingFace model + fallback heuristics (EXIF, texture, color, edges)  
✅ **Blockchain Registration** - Immutable timestamps on Sui testnet  
✅ **Duplicate Detection** - Pre-registration check prevents similar content  
✅ **Dispute System** - On-chain flagging for unauthorized reuse  

---

## Smart Contract Details

**Package ID:** `0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe`  
**Network:** Sui Testnet  
**Explorer:** https://suiscan.xyz/testnet/object/{package_id}

---

## Getting Help

- **GitHub Issues:** https://github.com/MuhammadMaazA/ETHOxford/issues
- **Sui Documentation:** https://docs.sui.io/
- **Supabase Docs:** https://supabase.com/docs

---

## Quick Start (TL;DR)

```bash
# 1. Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui

# 2. Clone & install
git clone https://github.com/MuhammadMaazA/ETHOxford.git
cd ETHOxford/hatchmark-frontend
npm install

# 3. Configure .env.local (copy template above)
# 4. Create Supabase tables (SQL above)

# 5. Run
npm run dev
```

Open http://localhost:3000 🚀
