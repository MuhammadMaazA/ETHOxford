# Supabase Setup Instructions

## Step 1: Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign in with GitHub (recommended)

## Step 2: Create New Project
1. Click "New Project"
2. **Project Name:** hatchmark-indexer
3. **Database Password:** (Generate a strong password and save it)
4. **Region:** Choose closest to you
5. **Pricing Plan:** Free (sufficient for hackathon)
6. Click "Create new project"
7. Wait 2-3 minutes for provisioning

## Step 3: Save Credentials
Once the project is created, go to **Settings > API** and save:

**Update `hatchmark-frontend/.env.local` with your credentials:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_KEY=[your-service-role-key]
```

The `.env.local` file has already been created in the `hatchmark-frontend/` directory.

## Step 4: Create Database Tables
Go to **SQL Editor** and run:

```sql
-- registrations table
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

-- disputes table  
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

## Step 5: Enable Realtime (Optional)
Go to **Database > Replication** and enable realtime for both tables.

---

**You can do this now while Sui CLI is installing! It takes 2-3 minutes.**
