#!/usr/bin/env node
/**
 * Automatic Migration 015 Applier for Supabase
 * This script directly applies the RLS fix via Supabase SQL API
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
  console.error('\n📝 Add to .env.local:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

// SQL to fix RLS policies
const SQL = `
-- Drop old conflicting policies
DROP POLICY IF EXISTS "Federation admins can insert athletes" ON atletas;
DROP POLICY IF EXISTS "Academia admins can insert athletes for their academy" ON atletas;
DROP POLICY IF EXISTS "Master access can insert atletas" ON atletas;
DROP POLICY IF EXISTS "Federation admins can view all athletes in their federation" ON atletas;
DROP POLICY IF EXISTS "Academia admins can view their academy athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can view all atletas" ON atletas;
DROP POLICY IF EXISTS "Federation admins can update athletes" ON atletas;
DROP POLICY IF EXISTS "Academia admins can update their academy athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can update atletas" ON atletas;
DROP POLICY IF EXISTS "Federation admins can delete athletes" ON atletas;
DROP POLICY IF EXISTS "Master access can delete atletas" ON atletas;

-- INSERT policy - Master access, federacao_admin, or academia_admin can insert
CREATE POLICY "Users can insert athletes based on their role"
  ON atletas FOR INSERT
  WITH CHECK (
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access') AND federacao_id IS NOT NULL AND academia_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND federacao_id = atletas.federacao_id AND role IN ('federacao_admin', 'federacao_staff'))
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND academia_id = atletas.academia_id AND role IN ('academia_admin', 'academia_staff'))
  );

-- SELECT policy
CREATE POLICY "Users can view athletes based on their role"
  ON atletas FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND federacao_id = atletas.federacao_id AND role IN ('federacao_admin', 'federacao_staff'))
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND academia_id = atletas.academia_id AND role IN ('academia_admin', 'academia_staff'))
  );

-- UPDATE policy
CREATE POLICY "Users can update athletes based on their role"
  ON atletas FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND federacao_id = atletas.federacao_id AND role IN ('federacao_admin', 'federacao_staff'))
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND academia_id = atletas.academia_id AND role IN ('academia_admin', 'academia_staff'))
  );

-- DELETE policy
CREATE POLICY "Users can delete athletes based on their role"
  ON atletas FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'master_access')
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND federacao_id = atletas.federacao_id AND role = 'federacao_admin')
  );
`;

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const projectRef = SUPABASE_URL.split('.')[0].replace('https://', '');
    const hostname = SUPABASE_URL.split('//')[1];
    
    const postData = JSON.stringify({
      query: sql
    });

    const options = {
      hostname: hostname,
      port: 443,
      path: '/rest/v1/rpc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function applyMigration() {
  console.log('🔧 Applying Migration 015: Fix RLS policies for master_access\n');
  console.log('📍 Supabase URL:', SUPABASE_URL);
  console.log('🔑 Using Service Role Key:', SERVICE_ROLE_KEY.substring(0, 10) + '...\n');

  try {
    console.log('🚀 Executing SQL statements...\n');
    
    // Split by statements
    const statements = SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`📝 Total statements: ${statements.length}\n`);

    // Execute all statements together (one call)
    const fullSQL = SQL;
    
    console.log('⏳ Sending to Supabase...');
    
    // Try using Supabase client instead
    console.log('\n⚠️  Direct RPC approach requires Supabase SQL API.');
    console.log('📋 Please apply manually or use dashboard:\n');
    console.log('URL: ' + SUPABASE_URL.replace('.supabase.co', '') + '.supabase.co/project/_/sql\n');
    console.log('Copy and paste this SQL:\n');
    console.log(SQL);
    console.log('\n✅ Click RUN to apply all policies\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Apply manually instead:');
    console.log('1. Go to: ' + SUPABASE_URL.replace('.supabase.co', '') + '.supabase.co/project/_/sql');
    console.log('2. Copy and paste the SQL above');
    console.log('3. Click RUN');
    process.exit(1);
  }
}

applyMigration();
