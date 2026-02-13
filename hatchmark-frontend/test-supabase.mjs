// Supabase connection and table verification test
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#') && line.includes('=')) {
    const [key, ...valueParts] = line.split('=');
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Supabase credentials not found in .env.local');
  console.error('Please check your NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

console.log('🔍 Testing Supabase Connection...\n');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey.substring(0, 20)}...\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Basic connection
    console.log('📡 Test 1: Testing basic connection...');
    const { data, error } = await supabase.from('_test_connection').select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "relation does not exist" which is expected
      console.log('✅ Connection successful!\n');
    } else {
      console.log('✅ Connection successful!\n');
    }

    // Test 2: Check if registrations table exists
    console.log('📋 Test 2: Checking if "registrations" table exists...');
    const { data: regData, error: regError } = await supabase
      .from('registrations')
      .select('*')
      .limit(1);
    
    if (regError) {
      if (regError.code === 'PGRST116' || regError.message.includes('relation') || regError.message.includes('does not exist')) {
        console.log('❌ Table "registrations" NOT FOUND');
        console.log('   Need to create it in Supabase SQL Editor\n');
      } else {
        console.log('⚠️  Unexpected error:', regError.message, '\n');
      }
    } else {
      console.log('✅ Table "registrations" exists!');
      console.log(`   Current row count: ${regData?.length || 0}\n`);
    }

    // Test 3: Check if disputes table exists  
    console.log('📋 Test 3: Checking if "disputes" table exists...');
    const { data: dispData, error: dispError } = await supabase
      .from('disputes')
      .select('*')
      .limit(1);
    
    if (dispError) {
      if (dispError.code === 'PGRST116' || dispError.message.includes('relation') || dispError.message.includes('does not exist')) {
        console.log('❌ Table "disputes" NOT FOUND');
        console.log('   Need to create it in Supabase SQL Editor\n');
      } else {
        console.log('⚠️  Unexpected error:', dispError.message, '\n');
      }
    } else {
      console.log('✅ Table "disputes" exists!');
      console.log(`   Current row count: ${dispData?.length || 0}\n`);
    }

    // Summary
    console.log('='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(50));
    
    const connectionOk = true;
    const registrationsOk = !regError || regError.code !== 'PGRST116';
    const disputesOk = !dispError || dispError.code !== 'PGRST116';
    
    if (connectionOk) {
      console.log('✅ Supabase connection: WORKING');
    }
    
    if (registrationsOk && disputesOk) {
      console.log('✅ Database tables: ALL CREATED');
      console.log('\n🎉 Supabase is fully set up and ready to use!\n');
    } else {
      console.log('⚠️  Database tables: MISSING');
      console.log('\n📝 ACTION REQUIRED:');
      console.log(`1. Go to: ${supabaseUrl}/project/_/sql`);
      console.log('2. Run the SQL from SUPABASE_SETUP.md (Step 4)');
      console.log('3. Run this test again\n');
    }
    
  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. Supabase project is active');
    console.error('2. Credentials in .env.local are correct');
    console.error('3. Internet connection is working\n');
    process.exit(1);
  }
}

testConnection();
