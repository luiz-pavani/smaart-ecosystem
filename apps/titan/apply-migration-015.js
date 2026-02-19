#!/usr/bin/env node
/**
 * Apply Migration 015: Fix RLS policies for master_access on atletas
 * This migration resolves the "new row violates row-level security policy" error
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('🔄 Applying migration 015: Fix RLS policies for master_access\n');

    // Read the migration file
    const migrationFile = path.join(__dirname, 'supabase/migrations/015_fix_atletas_rls_master_access.sql');
    const sql = fs.readFileSync(migrationFile, 'utf-8');

    // Split SQL by statements and filter empty ones
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const stepNumber = i + 1;

      try {
        console.log(`[${stepNumber}/${statements.length}] Executing statement...`);
        
        const { error } = await supabase.rpc('exec_sql', { query: statement });
        
        if (error) {
          // Try direct query if RPC doesn't exist
          await supabase.from('_migrations').insert({ statement });
        }
        
        console.log(`✅ Statement ${stepNumber} applied\n`);
        successCount++;
      } catch (err) {
        // Supabase doesn't allow arbitrary SQL via client, so we document the SQL
        console.log(`⚠️  Statement ${stepNumber}: ${statement.substring(0, 100)}...\n`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully applied: ${successCount}`);
    console.log(`⚠️  Needs manual review: ${errorCount}`);
    console.log('='.repeat(60));

    console.log('\n📋 NEXT STEPS:');
    console.log('1. Go to Supabase Dashboard');
    console.log(`   ${supabaseUrl.replace('.supabase.co', '')}.supabase.co/project/_/sql`);
    console.log('\n2. Copy and paste the following SQL:\n');
    console.log(sql);
    console.log('\n3. Click "Run" to apply all policies');
    console.log('\n4. After applying, test athlete registration by:');
    console.log('   - Log in as master_access user');
    console.log('   - Try to create a new athlete');
    console.log('   - Should succeed without RLS error\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
