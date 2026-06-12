import * as cheerio from 'cheerio';

export async function scrapeSouCompetidor() {
  console.log('🤖 Iniciando scraper: SouCompetidor...');
  const events: any[] = [];
  
  try {
    const response = await fetch('https://soucompetidor.com.br/pt-br/eventos/todos-os-eventos/');
    const data = await response.text();
    const $ = cheerio.load(data);

    $('.event-item, .card-evento').each((index, element) => {
      if (index >= 10) return false; 

      const title = $(element).find('h3, .title').text().trim();
      const link = $(element).find('a').attr('href');
      const dateText = $(element).find('.date, .data').text().trim();
      const location = $(element).find('.location, .local').text().trim();
      const posterUrl = $(element).find('img').attr('src');

      if (title && link) {
        events.push({
          name: title,
          url: link.startsWith('http') ? link : `https://soucompetidor.com.br${link}`,
          start_date: new Date().toISOString(),
          location: location || 'A definir',
          poster_url: posterUrl || null,
          source: 'SouCompetidor',
          modalities: ['Jiu-Jitsu'],
          status: 'published',
        });
      }
    });

    console.log(`✅ SouCompetidor: ${events.length} eventos capturados.`);
    return events;
  } catch (error: any) {
    console.error('❌ Erro no SouCompetidor:', error.message);
    return [];
  }
}