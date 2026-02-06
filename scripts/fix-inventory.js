// Script per ricalcolare l'inventario delle patch
// Esegui con: node scripts/fix-inventory.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://vzzdxvblxmmchgftfjiy.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6emR4dmJseG1tY2hnZnRmaml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDI3NzcsImV4cCI6MjA4NTg3ODc3N30._hTkfA5buO1J_1zRQzbY4BMiYjWvCdaSQFm8Pjb-Xws';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInventory() {
  console.log('Caricamento dati...\n');

  // 1. Carica tutte le patch
  const { data: patches, error: patchError } = await supabase.from('patch').select('*');
  if (patchError) {
    console.error('Errore caricamento patch:', patchError);
    return;
  }

  // 2. Carica tutte le vendite
  const { data: vendite, error: venditeError } = await supabase.from('vendite').select('*');
  if (venditeError) {
    console.error('Errore caricamento vendite:', venditeError);
    return;
  }

  // 3. Carica tutte le maglie
  const { data: maglie, error: maglieError } = await supabase.from('maglie').select('*');
  if (maglieError) {
    console.error('Errore caricamento maglie:', maglieError);
    return;
  }

  console.log(`Trovate ${patches.length} patch, ${vendite.length} vendite, ${maglie.length} maglie\n`);

  // Per ogni patch, ricalcola venduti
  for (const patch of patches) {
    // Conta vendite dirette (categoria = 'Patch' e prodotto contiene il nome della patch)
    const venditeCount = vendite
      .filter(v => v.categoria === 'Patch' && (
        v.prodotto_id === patch.id ||
        v.prodotto === patch.prodotto ||
        v.prodotto?.includes(patch.prodotto)
      ))
      .reduce((sum, v) => sum + (v.quantita || 1), 0);

    // Conta utilizzo nelle maglie
    let maglieCount = 0;
    for (const maglia of maglie) {
      let patchIds = [];
      if (maglia.patch_ids) {
        if (typeof maglia.patch_ids === 'string') {
          try {
            patchIds = JSON.parse(maglia.patch_ids);
          } catch {
            patchIds = [];
          }
        } else if (Array.isArray(maglia.patch_ids)) {
          patchIds = maglia.patch_ids;
        }
      }

      // Conta quante volte questa patch appare nella maglia
      maglieCount += patchIds.filter(id => id === patch.id).length;
    }

    const totalVenduti = venditeCount + maglieCount;
    const nuovoInMagazzino = patch.quantita_iniziale - totalVenduti;

    console.log(`${patch.prodotto}${patch.lotto ? ` [${patch.lotto}]` : ''}:`);
    console.log(`  - Quantità iniziale: ${patch.quantita_iniziale}`);
    console.log(`  - Vendite dirette: ${venditeCount}`);
    console.log(`  - Usate in maglie: ${maglieCount}`);
    console.log(`  - Totale venduti: ${totalVenduti} (attuale: ${patch.venduti})`);
    console.log(`  - In magazzino: ${nuovoInMagazzino} (attuale: ${patch.in_magazzino})`);

    if (totalVenduti !== patch.venduti || nuovoInMagazzino !== patch.in_magazzino) {
      console.log(`  → AGGIORNAMENTO necessario`);

      const { error: updateError } = await supabase
        .from('patch')
        .update({
          venduti: totalVenduti,
          in_magazzino: nuovoInMagazzino
        })
        .eq('id', patch.id);

      if (updateError) {
        console.error(`  ✗ Errore aggiornamento:`, updateError);
      } else {
        console.log(`  ✓ Aggiornato!`);
      }
    } else {
      console.log(`  → OK (nessun aggiornamento necessario)`);
    }
    console.log('');
  }

  console.log('Fatto!');
}

fixInventory();
