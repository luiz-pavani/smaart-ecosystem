const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

loadEnv(path.join(__dirname, '..', '.env.local'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function toMethodLabel(method) {
  const map = { boleto: 'Boleto', cartao: 'Cartão', pix: 'PIX', '1': 'Boleto', '2': 'Cartão', '6': 'PIX' };
  if (!method) return null;
  const key = String(method).toLowerCase();
  return map[key] || String(method).toUpperCase();
}

async function fetchAllVendas() {
  const vendas = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('vendas')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    vendas.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return vendas;
}

async function fetchAllMemberships() {
  const memberships = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('entity_memberships')
      .select('id, status_pagamento, valor_pago, last_transaction_id, progresso, profiles:profile_id(email), entities:entity_id(slug)')
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    memberships.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return memberships;
}

async function run() {
  console.log('Loading sales...');
  const vendas = await fetchAllVendas();

  const byEmail = new Map();
  const byTransaction = new Map();

  for (const v of vendas) {
    const email = normalizeEmail(v.email);
    if (v.transaction_id) {
      byTransaction.set(String(v.transaction_id), v);
    }
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push(v);
  }

  for (const [email, list] of byEmail.entries()) {
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    byEmail.set(email, list);
  }

  console.log('Loading memberships...');
  const memberships = await fetchAllMemberships();

  let updated = 0;
  let skipped = 0;
  let matchedByTransaction = 0;
  let matchedByEmailAndPlan = 0;

  for (const m of memberships) {
    const email = normalizeEmail(m.profiles?.email);
    const existingProgress = m.progresso || {};
    const existingPayment = existingProgress.payment_info || {};

    if (existingPayment && existingPayment.amount) {
      skipped += 1;
      continue;
    }

    let sale = null;
    if (m.last_transaction_id && byTransaction.has(String(m.last_transaction_id))) {
      sale = byTransaction.get(String(m.last_transaction_id));
      matchedByTransaction += 1;
    } else if (email && byEmail.has(email)) {
      const salesForEmail = byEmail.get(email);
      const gradSale = salesForEmail.find((s) => String(s.plano || '').toLowerCase().includes('gradua'));
      if (gradSale) {
        sale = gradSale;
        matchedByEmailAndPlan += 1;
      }
    }

    if (!sale) {
      skipped += 1;
      continue;
    }

    const paymentInfo = {
      ...existingPayment,
      method: sale.metodo || existingPayment.method,
      method_label: toMethodLabel(sale.metodo) || existingPayment.method_label,
      installments: existingPayment.installments || 1,
      due_date: existingPayment.due_date || null,
      amount: Number(sale.valor || m.valor_pago || 0),
      status: m.status_pagamento || 'PAGO',
      paid_at: sale.created_at || existingPayment.paid_at,
      transaction_id: sale.transaction_id || m.last_transaction_id || existingPayment.transaction_id
    };

    const progresso = { ...existingProgress, payment_info: paymentInfo };

    const { error } = await supabaseAdmin
      .from('entity_memberships')
      .update({ progresso })
      .eq('id', m.id);

    if (error) {
      console.error('Update error for membership', m.id, error.message);
      continue;
    }

    updated += 1;
  }

  console.log(`Backfill complete. Updated: ${updated}. Skipped: ${skipped}.`);
  console.log(`Matched by transaction: ${matchedByTransaction}. Matched by email+plan: ${matchedByEmailAndPlan}.`);
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
