const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vzzdxvblxmmchgftfjiy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6emR4dmJseG1tY2hnZnRmaml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDI3NzcsImV4cCI6MjA4NTg3ODc3N30._hTkfA5buO1J_1zRQzbY4BMiYjWvCdaSQFm8Pjb-Xws'
);

async function compare() {
  // Leggi Excel
  const workbook = XLSX.readFile('/Users/guidosquillace/Downloads/Gestione Magazzino 2.0.xlsx');

  // === PATCH ===
  console.log('\n========== PATCH ==========');
  const patchSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Patch']);
  const { data: dbPatch } = await supabase.from('patch').select('*');

  console.log('Excel:', patchSheet.length, 'righe');
  console.log('DB:', dbPatch.length, 'righe');

  // Confronta ogni patch dall'Excel
  for (const xlRow of patchSheet) {
    if (!xlRow['Prodotto']) continue;

    const nome = xlRow['Prodotto'];
    const xlMagazzino = xlRow['In Magazzino'] || 0;
    const xlVenduti = xlRow['Venduti / Usati'] || 0;
    const xlQtIniziale = xlRow['Quantità Iniziale'] || 0;

    // Cerca nel DB (potrebbe avere più lotti)
    const dbMatches = dbPatch.filter(p => p.prodotto === nome);

    if (dbMatches.length === 0) {
      console.log('❌ MANCANTE in DB:', nome);
    } else {
      // Somma i valori di tutti i lotti
      const dbMagazzino = dbMatches.reduce((s, p) => s + (p.in_magazzino || 0), 0);
      const dbVenduti = dbMatches.reduce((s, p) => s + (p.venduti || 0), 0);
      const dbQtIniziale = dbMatches.reduce((s, p) => s + (p.quantita_iniziale || 0), 0);

      if (xlMagazzino !== dbMagazzino || xlVenduti !== dbVenduti) {
        console.log('⚠️  DIFFERENZA:', nome);
        console.log('    Excel: magazzino=' + xlMagazzino + ', venduti=' + xlVenduti + ', iniziale=' + xlQtIniziale);
        console.log('    DB:    magazzino=' + dbMagazzino + ', venduti=' + dbVenduti + ', iniziale=' + dbQtIniziale);
      }
    }
  }

  // === VENDITE ===
  console.log('\n========== VENDITE ==========');
  const venditeSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Registro Vendite']);
  const { data: dbVendite } = await supabase.from('vendite').select('*');

  const xlVenditeCount = venditeSheet.filter(r => r['Data']).length;
  console.log('Excel:', xlVenditeCount, 'righe');
  console.log('DB:', dbVendite.length, 'righe');

  // Conta vendite per prodotto nell'Excel
  const xlVenditePerProdotto = {};
  for (const row of venditeSheet) {
    if (!row['Prodotto']) continue;
    const prod = row['Prodotto'];
    const qt = row['Quantità'] || 1;
    xlVenditePerProdotto[prod] = (xlVenditePerProdotto[prod] || 0) + qt;
  }

  // Conta vendite per prodotto nel DB
  const dbVenditePerProdotto = {};
  for (const row of dbVendite) {
    if (!row.prodotto) continue;
    // Rimuovi il lotto dal nome per confrontare
    let prod = row.prodotto;
    prod = prod.replace(/ \[\d+\]$/, ''); // Rimuove " [1]" o " [2]" alla fine
    const qt = row.quantita || 1;
    dbVenditePerProdotto[prod] = (dbVenditePerProdotto[prod] || 0) + qt;
  }

  // Confronta
  console.log('\nDifferenze per prodotto:');
  const allProducts = new Set([...Object.keys(xlVenditePerProdotto), ...Object.keys(dbVenditePerProdotto)]);
  let hasDiff = false;
  for (const prod of allProducts) {
    const xlQt = xlVenditePerProdotto[prod] || 0;
    const dbQt = dbVenditePerProdotto[prod] || 0;
    if (xlQt !== dbQt) {
      console.log('⚠️  ' + prod + ': Excel=' + xlQt + ', DB=' + dbQt);
      hasDiff = true;
    }
  }
  if (!hasDiff) console.log('✅ Nessuna differenza');

  // === MAGLIE ===
  console.log('\n========== MAGLIE ==========');
  const maglieSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Maglie']);
  const { data: dbMaglie } = await supabase.from('maglie').select('*');

  const xlMaglieCount = maglieSheet.filter(r => r['Maglia']).length;
  console.log('Excel:', xlMaglieCount, 'righe');
  console.log('DB:', dbMaglie.length, 'righe');

  console.log('\nMaglie Excel:');
  for (const xlRow of maglieSheet) {
    if (!xlRow['Maglia']) continue;
    const nome = xlRow['Maglia'];
    const stagione = xlRow['Stagione'];
    const stato = xlRow['Stato'];
    const costoTotale = xlRow['Costo Totale (€)'] || 0;

    const dbMatch = dbMaglie.find(m => m.maglia === nome && m.stagione === stagione);
    if (!dbMatch) {
      console.log('❌ MANCANTE in DB:', nome, stagione, '(' + stato + ')');
    } else {
      console.log('✅', nome, stagione, '(' + stato + ')');
    }
  }

  console.log('\nMaglie DB:');
  for (const dbRow of dbMaglie) {
    const xlMatch = maglieSheet.find(m => m['Maglia'] === dbRow.maglia && m['Stagione'] === dbRow.stagione);
    if (!xlMatch) {
      console.log('❌ MANCANTE in Excel:', dbRow.maglia, dbRow.stagione, '(' + dbRow.stato + ')');
    }
  }

  // === TUTE ===
  console.log('\n========== TUTE ==========');
  const tuteSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Tute']);
  const { data: dbTute } = await supabase.from('tute').select('*');

  const xlTuteCount = tuteSheet.filter(r => r['Tipo']).length;
  console.log('Excel:', xlTuteCount, 'righe');
  console.log('DB:', dbTute.length, 'righe');

  console.log('\nTute Excel:');
  for (const xlRow of tuteSheet) {
    if (!xlRow['Tipo']) continue;
    const tipo = xlRow['Tipo'];
    const squadra = xlRow['Squadra'];
    const stato = xlRow['Stato'];

    const dbMatch = dbTute.find(t => t.tipo === tipo && t.squadra === squadra);
    if (!dbMatch) {
      console.log('❌ MANCANTE in DB:', tipo, squadra, '(' + stato + ')');
    } else {
      console.log('✅', tipo, squadra, '(' + stato + ')');
    }
  }
}

compare();
