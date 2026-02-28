// Script de importação de atletas para Titan
// Requer: npm install csv-parser fs

const fs = require('fs');
const csv = require('csv-parser');

const SUPABASE_URL = 'https://risvafrrbnozyjquxvzi.supabase.co'; // Troque pelo seu URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc3ZhZnJyYm5venlqcXV4dnppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE2NDkxMywiZXhwIjoyMDg2NzQwOTEzfQ.kaZxNIQMoyY_eLgIfTJTFL8B-4hvdPJ_TDvRRW-qSPU'; // Troque pela sua chave
const TABLE = 'user_fed_lrsj'; // Troque pelo nome da tabela

const results = [];

async function insertAtleta(atletaObj) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify([atletaObj])
  });
  if (!res.ok) {
    console.error('Erro ao inserir:', await res.text());
  }
}

fs.createReadStream('/Users/judo365/Downloads/2026-02-26 FILIADOS.csv')
  .pipe(csv({ separator: ';' }))
  .on('data', (data) => results.push(data))
  .on('end', async () => {
    console.log('Total atletas:', results.length);
    for (const row of results) {
      const parseDan = (val) => {
        if (!val || isNaN(val)) return null;
        return parseInt(val);
      };
      const parseDate = (val) => {
        if (!val || val.trim() === '') return null;
        return val;
      };
      const atletaObj = {
        numero_membro: row['Member No'],
        nome_completo: row['Name'],
        nome_patch: row['NOME NO PATCH'],
        genero: row['Gender'],
        data_nascimento: parseDate(row['Birthdate']),
        idade: row['Age'],
        nacionalidade: row['Nationality'],
        email: row['Email'],
        telefone: row['Phone'],
        cidade: row['City'],
        estado: row['Province'],
        endereco_residencia: row['Residence'],
        graduacao: row['GRADUAÇÃO'],
        dan: parseDan(row['DAN']),
        nivel_arbitragem: row['Nível de Arbitragem'],
        academia_id: null, // Map if available
        status_membro: row['Member status'],
        data_adesao: parseDate(row['Member since']),
        plano_tipo: row['Plan'],
        status_plano: row['Plan status'],
        data_expiracao: parseDate(row['Expire date']),
        url_foto: row['Foto'],
        url_documento_id: row['Imagem da Carteira de Identidade ou Certidão de Nascimento '],
        url_certificado_dan: row['Certificado de dan'],
        tamanho_patch: row['TAMANHO DO PATCH (BACKNUMBER)'],
        lote_id: row['LOTE'],
        observacoes: row['OBSERVAÇÕES']
      };
      await insertAtleta(atletaObj);
    }
    console.log('Importação para Supabase concluída!');
  });
