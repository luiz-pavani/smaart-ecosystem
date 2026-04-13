import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeSmoothcomp() {
  console.log('🤖 Iniciando scraper: Smoothcomp...');
  const events: any[] = [];
  
  try {
    const { data } = await axios.get('https://smoothcomp.com/pt/events/upcoming');
    const $ = cheerio.load(data);

    $('.event-panel').each((index, element) => {
      if (index >= 10) return false;

      const title = $(element).find('.event-title').text().trim();
      const link = $(element).find('a.event-link').attr('href');
      const location = $(element).find('.location').text().trim();
      const posterUrl = $(element).find('.event-poster img').attr('src');

      if (title && link) {
        events.push({
          name: title,
          url: link.startsWith('http') ? link : `https://smoothcomp.com${link}`,
          start_date: new Date().toISOString(),
          location: location || 'A definir',
          poster_url: posterUrl || null,
          source: 'Smoothcomp',
          modalities: ['Jiu-Jitsu'],
          status: 'published',
        });
      }
    });

    console.log(`✅ Smoothcomp: ${events.length} eventos capturados.`);
    return events;
  } catch (error: any) {
    console.error('❌ Erro no Smoothcomp:', error.message);
    return [];
  }
}