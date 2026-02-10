import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const supabase = createClient('SEU_URL_SUPABASE', 'SUA_SERVICE_ROLE_KEY'); // Use a Service Role para ignorar RLS

async function migrate() {
  const fileContent = fs.readFileSync('PROFEP MIGRAÇÃO.csv', 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';'
  });

  console.log(`Iniciando migração de ${records.length} usuários...`);

  for (const row of records as Array<Record<string, string>>) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        email: row.EMAIL.toLowerCase().trim(),
        full_name: row.NOME,
        phone: row.FONE || null,
        cond: row.COND,
        origem: row.ORIGEM,
        migracao_pendente: true,
        plan: 'free' // Começam no free até resgatarem
      }, { onConflict: 'email' });

    if (error) console.error(`Erro ao importar ${row.EMAIL}:`, error.message);
    else console.log(`✓ ${row.EMAIL} preparado.`);
  }
}

migrate();