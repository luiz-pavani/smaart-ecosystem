import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Tenta carregar as variáveis do arquivo .env.local
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxmrqiohfrktwlkwmfyr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.warn('⚠️ AVISO: SUPABASE_SERVICE_ROLE_KEY não foi encontrada. Verifique seu arquivo .env.local');
}

// Cliente com privilégios de Admin para salvar os eventos ignorando RLS
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);