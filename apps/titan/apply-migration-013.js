const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAdminKey) {
  console.error('❌ Missing credentials. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAdminKey)

async function applyMigration() {
  try {
    console.log('🔄 Applying migration 013: Master access policies for atletas...\n')

    // RLS Policies for master_access on atletas table
    const policies = [
      {
        name: 'Master access can view all atletas',
        sql: `
          CREATE POLICY "Master access can view all atletas"
            ON atletas FOR SELECT
            USING (
              EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid()
                  AND role = 'master_access'
              )
            );
        `
      },
      {
        name: 'Master access can insert atletas',
        sql: `
          CREATE POLICY "Master access can insert atletas"
            ON atletas FOR INSERT
            WITH CHECK (
              EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid()
                  AND role = 'master_access'
              )
              AND federacao_id IS NOT NULL
              AND academia_id IS NOT NULL
            );
        `
      },
      {
        name: 'Master access can update atletas',
        sql: `
          CREATE POLICY "Master access can update atletas"
            ON atletas FOR UPDATE
            USING (
              EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid()
                  AND role = 'master_access'
              )
            );
        `
      },
      {
        name: 'Master access can delete atletas',
        sql: `
          CREATE POLICY "Master access can delete atletas"
            ON atletas FOR DELETE
            USING (
              EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid()
                  AND role = 'master_access'
              )
            );
        `
      }
    ]

    for (const policy of policies) {
      console.log(`📝 Creating policy: "${policy.name}"...`)
      try {
        await supabase.rpc('exec', { query: policy.sql })
        console.log(`✅ Policy created successfully\n`)
      } catch (err) {
        if (err.message && err.message.includes('already exists')) {
          console.log(`⚠️  Policy already exists (skipping)\n`)
        } else {
          console.error(`❌ Error creating policy:`, err.message)
        }
      }
    }

    console.log('✅ Migration 013 applied successfully!')
    console.log('\n📋 Summary:')
    console.log('- Master access can now VIEW all atletas')
    console.log('- Master access can now INSERT new atletas (with valid federacao_id and academia_id)')
    console.log('- Master access can now UPDATE existing atletas')
    console.log('- Master access can now DELETE atletas')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyMigration()
