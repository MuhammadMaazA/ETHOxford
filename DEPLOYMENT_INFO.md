# Hatchmark Deployment Info

## Contract Addresses

**Package ID:**
```
0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe
```

**Upgrade Cap:**
```
0x06a703612074203b62e69a770edb57a16fb0cee0e3b8f94bed44560ff2215bc1
```

**Deployer Address:**
```
0xbc29c6dc00f25b3a2ccb17471395854711076f9f0db2433621a338afda1093a5
```

**Network:** Sui Testnet

**Deployment Cost:** ~0.018 SUI (18,413,880 MIST)

**Checkpoint:** 294754688

## Module Details

**Module Name:** `hatchmark::registry`

**Entry Functions:**
- `register(hash: vector<u8>, title: String, description: String, clock: &Clock)`
- `flag_content(cert: &RegistrationCertificate, flagged_hash: vector<u8>, similarity_score: u8, clock: &Clock)`
- `resolve_dispute(dispute: &mut Dispute, cert: &RegistrationCertificate, resolution: u8)`

**Events:**
- `RegistrationEvent` — emitted when certificate is created
- `DisputeEvent` — emitted when content is flagged
- `DisputeResolvedEvent` — emitted when dispute is resolved

## Sui Explorer Link

https://suiscan.xyz/testnet/object/0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe

## Environment Variables (for Frontend)

Add these to your `.env.local`:

```bash
NEXT_PUBLIC_PACKAGE_ID=0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe
NEXT_PUBLIC_SUI_NETWORK=testnet
```

## Testing Commands

### Register a certificate via CLI:
```bash
sui client call \
  --package 0x65c282c2a27cd8e3ed94fef0275635ce5e2e569ef83adec8421069625c62d4fe \
  --module registry \
  --function register \
  --args "0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20" "Test Image" "My first registration" 0x6 \
  --gas-budget 10000000
```

Note: Replace `0x6` with the actual Clock object ID (shared object at `0x0000000000000000000000000000000000000000000000000000000000000006`)

### Query owned certificates:
```bash
sui client objects
```
