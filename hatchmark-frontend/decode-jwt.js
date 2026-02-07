// JWT Token Decoder
const token = "your-service-role-key";

const parts = token.split('.');

console.log("🔍 JWT Token Analysis\n");
console.log("=" .repeat(60));

// Decode header
const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
console.log("\n📋 Header:");
console.log(JSON.stringify(header, null, 2));

// Decode payload
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
console.log("\n📦 Payload:");
console.log(JSON.stringify(payload, null, 2));

// Check expiration
const now = Math.floor(Date.now() / 1000);
const expiresAt = new Date(payload.exp * 1000);
const issuedAt = new Date(payload.iat * 1000);
const isExpired = now > payload.exp;

console.log("\n⏰ Time Information:");
console.log(`Issued At:  ${issuedAt.toLocaleString()}`);
console.log(`Expires At: ${expiresAt.toLocaleString()}`);
console.log(`Status:     ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);

if (!isExpired) {
  const daysUntilExpiry = Math.floor((payload.exp - now) / 86400);
  console.log(`Valid for:  ${daysUntilExpiry} days`);
}

console.log("\n" + "=" .repeat(60));
console.log("\n✨ Token Type: Supabase Service Role Key");
console.log("🔐 Project:    " + payload.ref + ".supabase.co");
console.log("👤 Role:       " + payload.role);
console.log("\n⚠️  WARNING: This is a SERVICE_ROLE key (admin privileges)");
console.log("   Keep this secret! Never expose in client-side code.");
console.log("   Only use in server-side API routes or backend services.\n");
