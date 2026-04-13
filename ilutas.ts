import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeIlutas() {
  console.log('🤖 Iniciando scraper: iLutas...');
  const events: any[] = [];
  
  try {
    const { data } = await axios.get('https://www.ilutas.com.br/Eventos');
    const $ = cheerio.load(data);

    $('table tbody tr, .evento-item').each((index, element) => {
      if (index >= 10) return false;

      const title = $(element).find('a.titulo, td:nth-child(2) a').first().text().trim();
      const link = $(element).find('a.titulo, td:nth-child(2) a').first().attr('href');
      const location = $(element).find('.local, td:nth-child(4)').text().trim();

      if (title && link) {
        events.push({
          name: title,
          url: link.startsWith('http') ? link : `https://www.ilutas.com.br${link}`,
          start_date: new Date().toISOString(),
          location: location || 'A definir',
          poster_url: null,
          source: 'iLutas',
          modalities: ['Jiu-Jitsu'],
          status: 'published',
        });
      }
    });

    console.log(`✅ iLutas: ${events.length} eventos capturados.`);
    return events;
  } catch (error: any) {
    console.error('❌ Erro no iLutas:', error.message);
    return [];
  }
}