const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

(async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    process.exit(1);
  }

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
  await page.waitForSelector('text=BRANCO (Ippon)', { timeout: 5000 }).catch(()=>{});
  // Sometimes the button has exact text with symbol, use partial match
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