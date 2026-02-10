import { createClient } from '@supabase/supabase-js';

// Verifica se as chaves existem antes de tentar conectar
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("❌ Erro fatal: As chaves do Supabase (URL ou SERVICE_ROLE) estão faltando no .env.local");
}

// Este cliente tem poderes de SUPER ADMIN (ignora regras de segurança)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});