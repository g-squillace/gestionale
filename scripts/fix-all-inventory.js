import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vzzdxvblxmmchgftfjiy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6emR4dmJseG1tY2hnZnRmaml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDI3NzcsImV4cCI6MjA4NTg3ODc3N30._hTkfA5buO1J_1zRQzbY4BMiYjWvCdaSQFm8Pjb-Xws'
);

async function fixAll() {
  const { data: patches } = await supabase.from('patch').select('*').order('prodotto');
  const { data: vendite } = await supabase.from('vendite').select('*').eq('categoria', 'Patch');
  const { data: maglie } = await supabase.from('maglie').select('*');

  console.log('Verifica inventario...\n');

  for (const patch of patches) {
    const lottoLabel = patch.lotto ? ` [${patch.lotto}]` : '';
    const fullName = patch.prodotto + lottoLabel;

    // Conta vendite con nome esatto (include lotto)
    const patchVendite = vendite.filter(v =>
      v.prodotto_id === patch.id ||
      v.prodotto === fullName
    );
    const venditeCount = patchVendite.reduce((s, v) => s + (v.quantita || 1), 0);

    // Conta utilizzo in maglie
    let maglieCount = 0;
    for (const m of maglie) {
      let ids = [];
      try {
        ids = typeof m.patch_ids === 'string' ? JSON.parse(m.patch_ids) : (m.patch_ids || []);
      } catch {}
      maglieCount += ids.filter(id => id === patch.id).length;
    }

    const totVenduti = venditeCount + maglieCount;
    const inMagazzino = patch.quantita_iniziale - totVenduti;

    if (totVenduti !== patch.venduti || inMagazzino !== patch.in_magazzino) {
      console.log(`${fullName}:`);
      console.log(`  Vendite: ${venditeCount} + Maglie: ${maglieCount} = Venduti: ${totVenduti} (era ${patch.venduti})`);
      console.log(`  In magazzino: ${inMagazzino} (era ${patch.in_magazzino})`);

      await supabase.from('patch').update({
        venduti: totVenduti,
        in_magazzino: inMagazzino
      }).eq('id', patch.id);
      console.log('  → Corretto!\n');
    }
  }
  console.log('Verifica completata!');
}

fixAll();
