import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vzzdxvblxmmchgftfjiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6emR4dmJseG1tY2hnZnRmaml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDI3NzcsImV4cCI6MjA4NTg3ODc3N30._hTkfA5buO1J_1zRQzbY4BMiYjWvCdaSQFm8Pjb-Xws';
const supabase = createClient(supabaseUrl, supabaseKey);

// Converte data seriale Excel in stringa YYYY-MM-DD
function excelDateToString(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

// Leggi il file Excel
const workbook = XLSX.readFile('/Users/guidosquillace/Downloads/Gestione Magazzino 2.0.xlsx');

async function importData() {
  console.log('Inizio importazione dati da Excel...\n');

  // 1. PATCH
  // Colonne Excel: Prodotto, In Magazzino, Quantità Iniziale, Vendute, Costo Totale, Costo Unitario, Ricavo Vendite
  console.log('=== Importazione PATCH ===');
  const patchSheet = workbook.Sheets['Patch'];
  const patchData = XLSX.utils.sheet_to_json(patchSheet, { header: 1 });

  // Svuota la tabella esistente
  const { error: delPatch } = await supabase.from('patch').delete().neq('id', 0);
  if (delPatch) console.log('Delete patch:', delPatch);

  const patchItems = [];
  for (let i = 1; i < patchData.length; i++) {
    const row = patchData[i];
    if (!row[0]) continue;

    patchItems.push({
      prodotto: row[0] || '',
      in_magazzino: parseInt(row[1]) || 0,
      venduti: parseInt(row[2]) || 0,
      quantita_iniziale: parseInt(row[3]) || 0,
      costo_totale: parseFloat(row[4]) || 0,
      costo_unitario: parseFloat(row[5]) || 0,
      ricavo_vendite: parseFloat(row[6]) || 0,
    });
  }

  if (patchItems.length > 0) {
    const { error: patchError } = await supabase.from('patch').insert(patchItems);
    if (patchError) console.error('Errore patch:', patchError);
    else console.log(`Inserite ${patchItems.length} patch`);
  }

  // 2. TUTE
  // Colonne Excel: Tipo Tuta, Squadra, Categoria, Stagione, Descrizione, Costo, Prezzo Vendita, Stato, Profitto
  console.log('\n=== Importazione TUTE ===');
  const tuteSheet = workbook.Sheets['Tute'];
  const tuteData = XLSX.utils.sheet_to_json(tuteSheet, { header: 1 });

  await supabase.from('tute').delete().neq('id', 0);

  const tuteItems = [];
  for (let i = 1; i < tuteData.length; i++) {
    const row = tuteData[i];
    if (!row[0] && !row[1]) continue;

    tuteItems.push({
      tipo: row[0] || '',
      squadra: row[1] || '',
      categoria: row[2] || '',
      stagione: row[3] || '',
      descrizione: row[4] || '',
      costo: parseFloat(row[5]) || 0,
      prezzo_vendita: parseFloat(row[6]) || 0,
      stato: row[7] || 'In magazzino',
      profitto: parseFloat(row[8]) || 0,
    });
  }

  if (tuteItems.length > 0) {
    const { error: tuteError } = await supabase.from('tute').insert(tuteItems);
    if (tuteError) console.error('Errore tute:', tuteError);
    else console.log(`Inserite ${tuteItems.length} tute`);
  }

  // 3. MAGLIE
  // Colonne Excel: Maglia, Stagione, Costo Maglia, Patch1, Patch2, Patch3, Patch4, Costo Patch, Costo Totale, Prezzo Vendita, Stato, Profitto
  console.log('\n=== Importazione MAGLIE ===');
  const maglieSheet = workbook.Sheets['Maglie'];
  const maglieData = XLSX.utils.sheet_to_json(maglieSheet, { header: 1 });

  await supabase.from('maglie').delete().neq('id', 0);

  const maglieItems = [];
  for (let i = 1; i < maglieData.length; i++) {
    const row = maglieData[i];
    if (!row[0]) continue; // col 0 = Maglia

    // Combina patch da colonne 3-6
    const patches = [row[3], row[4], row[5], row[6]].filter(p => p && p.toString().trim());

    maglieItems.push({
      maglia: row[0] || '',
      stagione: row[1] || '',
      costo_maglia: parseFloat(row[2]) || 0,
      patches: patches,
      costo_patch: parseFloat(row[7]) || 0,
      costo_totale: parseFloat(row[8]) || 0,
      prezzo_vendita: parseFloat(row[9]) || 0,
      stato: row[10] || 'Da fare',
      profitto: parseFloat(row[11]) || 0,
    });
  }

  if (maglieItems.length > 0) {
    const { error: maglieError } = await supabase.from('maglie').insert(maglieItems);
    if (maglieError) console.error('Errore maglie:', maglieError);
    else console.log(`Inserite ${maglieItems.length} maglie`);
  }

  // 4. VENDITE (Registro Vendite)
  // Colonne Excel: Data, Categoria, Prodotto, Quantità, Totale, Piattaforma, Cliente
  console.log('\n=== Importazione VENDITE ===');
  const venditeSheet = workbook.Sheets['Registro Vendite'];
  const venditeData = XLSX.utils.sheet_to_json(venditeSheet, { header: 1 });

  await supabase.from('vendite').delete().neq('id', 0);

  const venditeItems = [];
  for (let i = 1; i < venditeData.length; i++) {
    const row = venditeData[i];
    if (!row[0] && !row[2]) continue;

    venditeItems.push({
      data: excelDateToString(row[0]) || new Date().toISOString().split('T')[0],
      categoria: row[1] || '',
      prodotto: row[2] || '',
      quantita: parseInt(row[3]) || 1,
      totale: parseFloat(row[4]) || 0,
      piattaforma: row[5] || '',
      cliente: row[6] || '',
    });
  }

  if (venditeItems.length > 0) {
    const { error: venditeError } = await supabase.from('vendite').insert(venditeItems);
    if (venditeError) console.error('Errore vendite:', venditeError);
    else console.log(`Inserite ${venditeItems.length} vendite`);
  }

  // 5. RICHIESTE
  // Colonne Excel: Data Richiesta, URL, Cliente, Categoria, Descrizione, Budget, Stato
  console.log('\n=== Importazione RICHIESTE ===');
  const richiesteSheet = workbook.Sheets['Richieste'];
  const richiesteData = XLSX.utils.sheet_to_json(richiesteSheet, { header: 1 });

  await supabase.from('richieste').delete().neq('id', 0);

  const richiesteItems = [];
  for (let i = 1; i < richiesteData.length; i++) {
    const row = richiesteData[i];
    if (!row[0] && !row[2] && !row[4]) continue;

    richiesteItems.push({
      data_richiesta: excelDateToString(row[0]) || new Date().toISOString().split('T')[0],
      url: row[1] || '',
      cliente: row[2] || '',
      categoria: row[3] || '',
      descrizione: row[4] || '',
      budget: parseFloat(row[5]) || 0,
      stato: row[6] || 'In attesa',
    });
  }

  if (richiesteItems.length > 0) {
    const { error: richiesteError } = await supabase.from('richieste').insert(richiesteItems);
    if (richiesteError) console.error('Errore richieste:', richiesteError);
    else console.log(`Inserite ${richiesteItems.length} richieste`);
  }

  console.log('\n=== Importazione completata! ===');
}

importData().catch(console.error);
