import { supabaseAdmin } from './utils/supabase';
import { scrapeSouCompetidor } from './sources/soucompetidor';
import { scrapeIlutas } from './sources/ilutas';
import { scrapeSmoothcomp } from './sources/smoothcomp';

async function runAllScrapers() {
  console.log('🚀 Iniciando rotina global de captura de eventos...');
  const allEvents: any[] = [];

  const scEvents = await scrapeSouCompetidor();
  const ilutasEvents = await scrapeIlutas();
  const smoothcompEvents = await scrapeSmoothcomp();

  allEvents.push(...scEvents, ...ilutasEvents, ...smoothcompEvents);

  if (allEvents.length === 0) {
    console.log('Nenhum evento capturado. Encerrando.');
    return;
  }

  console.log(`💾 Salvando ${allEvents.length} eventos no Supabase...`);

  const { data, error } = await supabaseAdmin
    .from('events')
    .upsert(allEvents, { onConflict: 'url' });

  if (error) {
    console.error('❌ Erro ao salvar no banco de dados:', error);
  } else {
    console.log('🎉 Rotina finalizada com sucesso! Todos os eventos estão no banco.');
  }
}

runAllScrapers();