const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vzzdxvblxmmchgftfjiy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6emR4dmJseG1tY2hnZnRmaml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDI3NzcsImV4cCI6MjA4NTg3ODc3N30._hTkfA5buO1J_1zRQzbY4BMiYjWvCdaSQFm8Pjb-Xws'
);

async function check() {
  // Patch
  const { data: patches } = await supabase.from('patch').select('*');

  console.log('=== PATCH nel DB ===');
  const interessanti = ['Serie A 04/08', 'Serie A 10/15', 'Serie A 08/10', 'Messi'];
  patches.filter(p => interessanti.some(i => p.prodotto.includes(i))).forEach(p => {
    console.log(`${p.prodotto} [${p.lotto}]: iniziale=${p.quantita_iniziale}, venduti=${p.venduti}, magazzino=${p.in_magazzino}`);
  });

  // Vendite
  const { data: vendite } = await supabase.from('vendite').select('*');

  console.log('\n=== VENDITE nel DB (Serie A) ===');
  const perProdotto = {};
  vendite.filter(v => v.prodotto && v.prodotto.includes('Serie A')).forEach(v => {
    const key = v.prodotto;
    if (!perProdotto[key]) perProdotto[key] = 0;
    perProdotto[key] += v.quantita || 1;
  });

  Object.keys(perProdotto).sort().forEach(k => {
    console.log(`${k}: ${perProdotto[k]} vendute`);
  });

  // Excel values per confronto
  console.log('\n=== CONFRONTO con Excel ===');
  console.log('Patch Serie A 04/08:');
  console.log('  Excel Lotto 1: 21 vendute (iniziale 21)');
  console.log('  Excel Lotto 2: 9 vendute (dal prodotto con .)');

  console.log('\nPatch Serie A 10/15:');
  console.log('  Excel Lotto 1: 4 vendute (iniziale 4)');
  console.log('  Excel Lotto 2: 3 vendute (dal prodotto con .)');

  console.log('\nPatch Serie A 08/10:');
  console.log('  Excel: 4 vendute (iniziale 7)');
}
check();
