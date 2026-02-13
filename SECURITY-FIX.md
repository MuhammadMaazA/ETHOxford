# Security Fix Guide - Hardcoded API Keys Removal

## Overview
This guide documents the security fixes applied to remove hardcoded Supabase API keys from the repository.

---

## Issue Summary

**Severity:** CRITICAL
**Type:** Hardcoded API credentials in source code
**Impact:** Public exposure of Supabase service role key and database URL

### Files Affected:
1. `hatchmark-frontend/scripts/sync-once.ts` - Contained hardcoded SUPABASE_URL and SUPABASE_KEY
2. `hatchmark-frontend/scripts/indexer.ts` - Contained hardcoded SUPABASE_URL fallback

---

## Step-by-Step Fix Instructions

### Step 1: Fix `hatchmark-frontend/scripts/sync-once.ts`

**FIND THIS CODE (Lines 9-12):**
```typescript
const PACKAGE_ID = '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-service-role-key';
const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443';
```

**REPLACE WITH:**
```typescript
// Load environment variables
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
```

**Add this import at the top of the file (after existing imports):**
```typescript
import * as dotenv from 'dotenv';
import { resolve } from 'path';
```

---

### Step 2: Fix `hatchmark-frontend/scripts/indexer.ts`

**FIND THIS CODE (Lines 14-19):**
```typescript
// Configuration
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443';
const POLL_INTERVAL_MS = 10000; // 10 seconds
```

**REPLACE WITH:**
```typescript
// Configuration
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443';
const POLL_INTERVAL_MS = 10000; // 10 seconds

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing required environment variables!');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}
```

---

### Step 3: Verify .gitignore is Correct

Check `hatchmark-frontend/.gitignore` contains:
```gitignore
# env files (can opt-in for committing if needed)
.env*.local
.env.local
!.env.example
```

This should already be present. If not, add it.

---

### Step 4: Verify .env.example is Safe

Check `hatchmark-frontend/.env.example` contains ONLY placeholders:
```env
# Hatchmark Environment Variables
# Copy this to .env.local and fill in your values

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Sui Configuration
NEXT_PUBLIC_PACKAGE_ID=0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe
NEXT_PUBLIC_SUI_NETWORK=testnet
```

✅ This file is safe - it contains only placeholder values.

---

## Installation Instructions (for package.json)

Ensure `dotenv` is installed for the scripts to work:

```bash
cd hatchmark-frontend
npm install dotenv
```

Or add to `package.json` devDependencies if not present:
```json
{
  "devDependencies": {
    "dotenv": "^16.0.0"
  }
}
```

---

## Git Commands to Apply Fix

```bash
# Navigate to repository
cd path/to/ETHOxford

# Make the changes to the files as documented above

# Stage the changes
git add hatchmark-frontend/scripts/sync-once.ts
git add hatchmark-frontend/scripts/indexer.ts

# Commit with security message
git commit -m "security: remove hardcoded API keys from scripts"

# Push to repository
git push origin master
```

---

## Verification Steps

### 1. Check No Hardcoded Keys
```bash
# Search for any remaining hardcoded Supabase URLs or keys
grep -r "aihbjipldsowxgexrhvq" hatchmark-frontend --exclude-dir=node_modules --exclude-dir=.next
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" hatchmark-frontend --exclude-dir=node_modules --exclude-dir=.next
```

Both should return no results (or only in git history).

### 2. Check Scripts Require Env Vars
```bash
cd hatchmark-frontend
npx tsx scripts/sync-once.ts
```

Should output:
```
ERROR: Missing required environment variables!
Please create .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY
```

### 3. Test with Proper Env Vars
Create `.env.local` with correct values, then:
```bash
npx tsx scripts/sync-once.ts
```

Should connect and sync successfully.

---

## Post-Fix Security Actions Required

### CRITICAL: Rotate Compromised Keys

Since the keys were committed to git history:

1. **Go to Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/aihbjipldsowxgexrhvq/settings/api
   - Login with project owner account

2. **Reset Service Role Key:**
   - Click "Reset" next to Service Role Key
   - Copy the new key
   - Update `.env.local` with new key
   - Update any production deployments

3. **Review Database Security:**
   - Check Supabase logs for unauthorized access
   - Review Row Level Security (RLS) policies
   - Consider enabling additional security features

4. **Update All Deployments:**
   - Vercel environment variables
   - Render/Railway deployments
   - Any CI/CD pipelines
   - Team members' local `.env.local` files

---

## Optional: Remove Keys from Git History

If you want to completely remove the exposed keys from git history:

### Using BFG Repo-Cleaner (Recommended)

```bash
# Install BFG
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Backup your repo first
cp -r ETHOxford ETHOxford-backup

# Create a file with the exposed key
echo 'your-service-role-key' > secrets.txt

# Run BFG
java -jar bfg.jar --replace-text secrets.txt ETHOxford

# Clean up
cd ETHOxford
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: Rewrites history)
git push --force origin master
```

**WARNING:** This rewrites git history and forces everyone to re-clone the repository.

---

## Summary of Changes

### Files Modified:
- ✅ `hatchmark-frontend/scripts/sync-once.ts` - Removed hardcoded keys, added env var loading
- ✅ `hatchmark-frontend/scripts/indexer.ts` - Removed hardcoded URL fallback, added validation

### Files Verified Safe:
- ✅ `hatchmark-frontend/.env.example` - Contains only placeholders
- ✅ `hatchmark-frontend/.gitignore` - Properly excludes `.env.local`

### Security Improvements:
- ✅ Scripts now require environment variables to run
- ✅ Clear error messages if env vars are missing
- ✅ No hardcoded credentials in source code
- ✅ Follows security best practices

---

## Contact Information

If you need help applying these fixes or have questions:
- Create an issue in the repository
- Contact the security team
- Reference this document: `SECURITY_FIX_GUIDE.md`

---

**Last Updated:** 2026-02-13
**Fix Applied By:** Security Audit
**Status:** APPLIED ✅
