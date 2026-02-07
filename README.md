# Hatchmark

Content authenticity verification on Sui blockchain. Prove origin and timestamp of your digital content through immutable hatch marks.

## Live Demo

Frontend: [Vercel Deployment](https://hatchmark.vercel.app)

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, Sui Wallet Kit
- **Blockchain**: Sui Network (Testnet)
- **Backend**: Supabase (PostgreSQL + Storage)
- **Image Processing**: Perceptual hashing (phash) for verification

## Quick Start

### Frontend

```bash
cd hatchmark-frontend
npm install
npm run dev
```

Visit http://localhost:3000

### Environment Variables

Create `hatchmark-frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_SUI_PACKAGE_ID=0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe
```

## How It Works

1. **Register**: Upload content → Generate phash → Create Sui blockchain transaction → Store in Supabase
2. **Verify**: Upload content → Calculate phash → Check against database → Display match status
3. **Flag**: Report suspicious content → Create dispute transaction on Sui

## Project Structure

```
hatchmark-authenticity-service/
├── hatchmark-frontend/     # Next.js app
├── sui-contracts/          # Sui Move contracts
└── SUPABASE_SETUP.md      # Database setup guide
```

## Deployment

### Frontend (Vercel)

```bash
cd hatchmark-frontend
vercel
```

### Supabase Setup

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

## License

MIT
