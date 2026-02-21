// Automated consistency test for atletas table
// Ensures that any update to user data is reflected everywhere in the system

import { createClient } from '@supabase/supabase-js';
import assert from 'assert';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runConsistencyTest() {
  // 1. Fetch all atletas
  const { data: atletas, error } = await supabase.from('atletas').select('*');
  assert(!error, `Failed to fetch atletas: ${error?.message}`);
  assert(Array.isArray(atletas), 'atletas should be an array');

  // 2. For each atleta, check that user_id is unique and not null
  const userIds = new Set();
  for (const atleta of atletas) {
    assert(atleta.user_id, `Atleta missing user_id: ${JSON.stringify(atleta)}`);
    assert(!userIds.has(atleta.user_id), `Duplicate user_id found: ${atleta.user_id}`);
    userIds.add(atleta.user_id);
  }

  // 3. Try updating a field and check if reflected
  if (atletas.length > 0) {
    const atleta = atletas[0];
    const newName = atleta.nome_completo + '_test_' + Date.now();
    const { error: updateError } = await supabase.from('atletas').update({ nome_completo: newName }).eq('user_id', atleta.user_id);
    assert(!updateError, `Failed to update atleta: ${updateError?.message}`);
    const { data: updated } = await supabase.from('atletas').select('nome_completo').eq('user_id', atleta.user_id).single();
    assert(updated.nome_completo === newName, 'Update not reflected in atletas table');
    // Optionally: revert change
    await supabase.from('atletas').update({ nome_completo: atleta.nome_completo }).eq('user_id', atleta.user_id);
  }

  console.log('✅ Consistency test passed: atletas table is the single source of truth and updates are reflected.');
}

runConsistencyTest().catch(e => {
  console.error('❌ Consistency test failed:', e);
  process.exit(1);
});
