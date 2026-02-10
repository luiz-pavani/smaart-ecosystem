import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

(async () => {
  const supabaseUrl = 'https://swvkleuxdqvyygelnxgc.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3dmtsZXV4ZHF2eXlnZWxueGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjQ5NjUsImV4cCI6MjA4Mjk0MDk2NX0.GlroeJMkACCt-qqpux1-gzlv9WVl8iD1ELcy_CfBaQg';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  console.log('Opening app...');
  await page.goto('http://localhost:5174/');

  // Wait for UI to be ready
  await page.waitForSelector('text=SOREMADE', { timeout: 10000 });
  console.log('Clicking SOREMADE button...');
  await page.click('text=SOREMADE');

  // Wait for soremade modal
  await page.waitForSelector('text=Registrar Resultado', { timeout: 5000 });
  console.log('Opening Registrar Resultado...');
  await page.click('text=Registrar Resultado');

  // Wait for modal buttons and click BRANCO IPPON
  await page.waitForSelector('text=BRANCO', { timeout: 5000 }).catch(()=>{});
  const brancoBtn = page.locator('button', { hasText: 'BRANCO' }).first();
  console.log('Clicking BRANCO Ippon button...');
  await brancoBtn.click();

  // Wait a short moment for supabase insert to complete
  await page.waitForTimeout(1500);

  // Query supabase for latest match_results
  const { data, error } = await supabase
    .from('match_results')
    .select('*')
    .order('id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Supabase error:', error);
  } else {
    console.log('Latest match_result:', data && data[0] ? data[0] : 'none');
  }

  await browser.close();
  process.exit(0);
})();
