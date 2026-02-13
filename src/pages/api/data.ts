import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

// Mappa nomi campi: frontend (camelCase) -> database (snake_case)
const fieldMaps: Record<string, Record<string, string>> = {
  patch: {
    inMagazzino: 'in_magazzino',
    quantitaIniziale: 'quantita_iniziale',
    costoTotale: 'costo_totale',
    costoUnitario: 'costo_unitario',
    ricavoVendite: 'ricavo_vendite',
  },
  tute: {
    prezzoVendita: 'prezzo_vendita',
  },
  maglie: {
    costoMaglia: 'costo_maglia',
    costoPatch: 'costo_patch',
    costoTotale: 'costo_totale',
    prezzoVendita: 'prezzo_vendita',
    patchIds: 'patch_ids',
  },
  vendite: {
    prodottoId: 'prodotto_id',
  },
  richieste: {
    dataRichiesta: 'data_richiesta',
  },
};

// Converti da camelCase a snake_case per il database
function toDbFormat(collection: string, item: any): any {
  const map = fieldMaps[collection] || {};
  const result: any = {};

  for (const [key, value] of Object.entries(item)) {
    const dbKey = map[key] || key;
    result[dbKey] = value;
  }

  // Rimuovi id se presente (gestito da Supabase)
  delete result.id;

  // Gestione speciale per patch_ids - salvato come JSON string in colonna text
  if (result.patch_ids !== undefined) {
    let patchIds = result.patch_ids;

    // Se è una stringa, prova a parsarla
    if (typeof patchIds === 'string') {
      try {
        patchIds = JSON.parse(patchIds);
      } catch {
        patchIds = [];
      }
    }

    // Assicurati che sia un array di numeri e convertilo in JSON string
    if (Array.isArray(patchIds)) {
      const numericIds = patchIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0);
      result.patch_ids = JSON.stringify(numericIds);
    } else {
      result.patch_ids = '[]';
    }
  }

  // Gestione speciale per patches (nomi) - salvato come JSON string in colonna text
  if (result.patches !== undefined) {
    let patches = result.patches;

    // Se è una stringa, prova a parsarla
    if (typeof patches === 'string') {
      try {
        patches = JSON.parse(patches);
      } catch {
        // Se non è JSON, potrebbe essere una stringa singola o separata da virgole
        patches = patches.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      }
    }

    // Assicurati che sia un array di stringhe e convertilo in JSON string
    if (Array.isArray(patches)) {
      result.patches = JSON.stringify(patches);
    } else {
      result.patches = '[]';
    }
  }

  return result;
}

// Converti da snake_case a camelCase per il frontend
function toFrontendFormat(collection: string, item: any): any {
  const map = fieldMaps[collection] || {};
  const reverseMap: Record<string, string> = {};

  for (const [camel, snake] of Object.entries(map)) {
    reverseMap[snake] = camel;
  }

  const result: any = {};
  for (const [key, value] of Object.entries(item)) {
    const frontendKey = reverseMap[key] || key;
    result[frontendKey] = value;
  }

  // Parsa patch_ids da JSON string a array per il frontend
  if (result.patch_ids && typeof result.patch_ids === 'string') {
    try {
      result.patch_ids = JSON.parse(result.patch_ids);
    } catch {
      result.patch_ids = [];
    }
  }

  // Parsa patches da JSON string a array per il frontend
  if (result.patches && typeof result.patches === 'string') {
    try {
      result.patches = JSON.parse(result.patches);
    } catch {
      result.patches = [];
    }
  }

  return result;
}

// GET - Leggi tutti i dati
export const GET: APIRoute = async () => {
  try {
    const [patchRes, tuteRes, maglieRes, venditeRes, richiesteRes] = await Promise.all([
      supabase.from('patch').select('*'),
      supabase.from('tute').select('*'),
      supabase.from('maglie').select('*'),
      supabase.from('vendite').select('*').order('data', { ascending: false }),
      supabase.from('richieste').select('*').order('data_richiesta', { ascending: false }),
    ]);

    const data = {
      patch: (patchRes.data || []).map(item => toFrontendFormat('patch', item)),
      tute: (tuteRes.data || []).map(item => toFrontendFormat('tute', item)),
      maglie: (maglieRes.data || []).map(item => toFrontendFormat('maglie', item)),
      vendite: (venditeRes.data || []).map(item => toFrontendFormat('vendite', item)),
      richieste: (richiesteRes.data || []).map(item => toFrontendFormat('richieste', item)),
    };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('GET error:', error);
    return new Response(JSON.stringify({ error: 'Errore lettura dati' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Sincronizza inventario quando viene aggiunta una vendita
async function syncInventoryOnSale(vendita: any) {
  const { categoria, prodotto, prodotto_id, quantita, totale } = vendita;

  if (categoria === 'Patch') {
    // Trova la patch per ID (preferito) o nome prodotto
    let patch = null;

    if (prodotto_id) {
      const { data } = await supabase
        .from('patch')
        .select('*')
        .eq('id', prodotto_id)
        .single();
      patch = data;
    } else {
      // Fallback: cerca per nome (compatibilità con vecchie vendite)
      const { data: patches } = await supabase
        .from('patch')
        .select('*')
        .eq('prodotto', prodotto);
      patch = patches?.[0];
    }

    if (patch) {
      const nuoviVenduti = (patch.venduti || 0) + (quantita || 1);
      const nuovoRicavo = (patch.ricavo_vendite || 0) + (totale || 0);
      const nuovoProfitto = nuovoRicavo - (patch.costo_unitario * nuoviVenduti);

      await supabase
        .from('patch')
        .update({
          venduti: nuoviVenduti,
          in_magazzino: patch.quantita_iniziale - nuoviVenduti,
          ricavo_vendite: nuovoRicavo,
          profitto: nuovoProfitto
        })
        .eq('id', patch.id);
    }
  } else if (categoria === 'Tuta') {
    // Trova la tuta per ID (preferito) o nome prodotto
    let tuta = null;

    if (prodotto_id) {
      const { data } = await supabase
        .from('tute')
        .select('*')
        .eq('id', prodotto_id)
        .single();
      tuta = data;
    } else {
      // Fallback: cerca per nome (compatibilità con vecchie vendite)
      const { data: tute } = await supabase
        .from('tute')
        .select('*')
        .eq('stato', 'In magazzino');

      if (tute) {
        tuta = tute.find(t =>
          prodotto.toLowerCase().includes(t.squadra.toLowerCase())
        ) || null;
      }
    }

    if (tuta) {
      const profitto = (totale || 0) - tuta.costo;
      await supabase
        .from('tute')
        .update({
          stato: 'Venduto',
          prezzo_vendita: totale || 0,
          profitto: profitto
        })
        .eq('id', tuta.id);
    }
  } else if (categoria === 'Maglia') {
    // Trova la maglia per ID (preferito) o nome prodotto
    let maglia = null;

    if (prodotto_id) {
      const { data } = await supabase
        .from('maglie')
        .select('*')
        .eq('id', prodotto_id)
        .single();
      maglia = data;
    } else {
      // Fallback: cerca per nome+stagione (compatibilità con vecchie vendite)
      const { data: maglie } = await supabase
        .from('maglie')
        .select('*')
        .neq('stato', 'Venduta');

      if (maglie) {
        // Match preciso: nome maglia + stagione
        maglia = maglie.find(m => {
          const nomeCompleto = `${m.maglia} ${m.stagione}`.toLowerCase();
          return prodotto.toLowerCase() === nomeCompleto;
        }) || maglie.find(m =>
          prodotto.toLowerCase().includes(m.maglia.toLowerCase())
        ) || null;
      }
    }

    if (maglia) {
      const profitto = (totale || 0) - maglia.costo_totale;
      await supabase
        .from('maglie')
        .update({
          stato: 'Venduta',
          prezzo_vendita: totale || 0,
          profitto: profitto
        })
        .eq('id', maglia.id);
    }
  }
}

// Scala inventario patch quando vengono usate per una maglia
async function deductPatchesForMaglia(patchIds: number[]) {
  if (!patchIds || patchIds.length === 0) return;

  for (const patchId of patchIds) {
    const { data: patch } = await supabase
      .from('patch')
      .select('*')
      .eq('id', patchId)
      .single();

    if (patch) {
      const nuoviVenduti = (patch.venduti || 0) + 1;
      const nuovoInMagazzino = patch.quantita_iniziale - nuoviVenduti;

      await supabase
        .from('patch')
        .update({
          venduti: nuoviVenduti,
          in_magazzino: nuovoInMagazzino
        })
        .eq('id', patchId);
    }
  }
}

// Ripristina inventario patch quando una maglia viene eliminata o le patch vengono rimosse
async function restorePatchesFromMaglia(patchIds: number[]) {
  if (!patchIds || patchIds.length === 0) return;

  for (const patchId of patchIds) {
    const { data: patch } = await supabase
      .from('patch')
      .select('*')
      .eq('id', patchId)
      .single();

    if (patch) {
      const nuoviVenduti = Math.max(0, (patch.venduti || 0) - 1);
      const nuovoInMagazzino = patch.quantita_iniziale - nuoviVenduti;

      await supabase
        .from('patch')
        .update({
          venduti: nuoviVenduti,
          in_magazzino: nuovoInMagazzino
        })
        .eq('id', patchId);
    }
  }
}

// Calcola il costo totale delle patch selezionate
async function calculatePatchCost(patchIds: number[]): Promise<number> {
  if (!patchIds || patchIds.length === 0) return 0;

  let totalCost = 0;
  for (const patchId of patchIds) {
    const { data: patch } = await supabase
      .from('patch')
      .select('costo_unitario')
      .eq('id', patchId)
      .single();

    if (patch) {
      totalCost += patch.costo_unitario || 0;
    }
  }
  return totalCost;
}

// POST - Aggiungi nuovo elemento
export const POST: APIRoute = async ({ request }) => {
  try {
    const { collection, item } = await request.json();

    // Estrai patch_ids PRIMA della conversione per usarlo dopo
    let patchIdsToDeduct: number[] = [];
    if (collection === 'maglie' && item.patch_ids) {
      if (Array.isArray(item.patch_ids)) {
        patchIdsToDeduct = item.patch_ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
      } else if (typeof item.patch_ids === 'string') {
        try {
          const parsed = JSON.parse(item.patch_ids);
          if (Array.isArray(parsed)) {
            patchIdsToDeduct = parsed.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
          }
        } catch {}
      }

      // Calcola automaticamente il costo delle patch
      const costoPatch = await calculatePatchCost(patchIdsToDeduct);
      item.costoPatch = costoPatch;
      item.costoTotale = (item.costoMaglia || 0) + costoPatch;
    }

    const dbItem = toDbFormat(collection, item);

    const { data, error } = await supabase
      .from(collection)
      .insert(dbItem)
      .select();

    if (error) throw error;

    // Se è una vendita, sincronizza l'inventario
    if (collection === 'vendite' && data && data.length > 0) {
      await syncInventoryOnSale(data[0]);
    }

    // Se è una maglia con patch, scala l'inventario delle patch
    if (collection === 'maglie' && patchIdsToDeduct.length > 0) {
      await deductPatchesForMaglia(patchIdsToDeduct);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('POST error:', error);
    return new Response(JSON.stringify({ error: 'Errore aggiunta elemento' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Modifica elemento esistente
export const PUT: APIRoute = async ({ request }) => {
  try {
    const { collection, index, item } = await request.json();

    // Per le vendite, usa lo stesso ordinamento della tabella
    let itemId = null;
    let oldMaglia = null;

    if (collection === 'vendite') {
      const { data: vendite } = await supabase
        .from('vendite')
        .select('id')
        .order('data', { ascending: false });
      if (vendite && index >= 0 && index < vendite.length) {
        itemId = vendite[index].id;
      }
    } else if (collection === 'maglie') {
      // Per le maglie, recupera anche i dati vecchi per gestire le patch
      const { data: items } = await supabase.from(collection).select('*');
      if (items && index >= 0 && index < items.length) {
        oldMaglia = items[index];
        itemId = items[index].id;
      }
    } else {
      const { data: items } = await supabase.from(collection).select('id');
      if (items && index >= 0 && index < items.length) {
        itemId = items[index].id;
      }
    }

    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Elemento non trovato' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Se è una maglia, gestisci le modifiche alle patch PRIMA della conversione
    if (collection === 'maglie' && oldMaglia) {
      // patch_ids è salvato come JSON string, parsalo
      let oldPatchIds: number[] = [];
      if (oldMaglia.patch_ids) {
        try {
          const parsed = typeof oldMaglia.patch_ids === 'string'
            ? JSON.parse(oldMaglia.patch_ids)
            : oldMaglia.patch_ids;
          if (Array.isArray(parsed)) {
            oldPatchIds = parsed.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
          }
        } catch {}
      }
      // Prendi i nuovi patch_ids dall'item originale (prima della conversione)
      let newPatchIds: number[] = [];
      if (item.patch_ids) {
        if (Array.isArray(item.patch_ids)) {
          newPatchIds = item.patch_ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
        } else if (typeof item.patch_ids === 'string') {
          try {
            const parsed = JSON.parse(item.patch_ids);
            if (Array.isArray(parsed)) {
              newPatchIds = parsed.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
            }
          } catch {}
        }
      }

      // Calcola automaticamente il costo delle patch
      const costoPatch = await calculatePatchCost(newPatchIds);
      item.costoPatch = costoPatch;
      item.costoTotale = (item.costoMaglia || 0) + costoPatch;

      // Trova patch rimosse (erano nelle vecchie, non nelle nuove)
      const removedPatches = oldPatchIds.filter(id => !newPatchIds.includes(id));
      // Trova patch aggiunte (sono nelle nuove, non nelle vecchie)
      const addedPatches = newPatchIds.filter(id => !oldPatchIds.includes(id));

      // Ripristina inventario per patch rimosse
      if (removedPatches.length > 0) {
        await restorePatchesFromMaglia(removedPatches);
      }
      // Scala inventario per patch aggiunte
      if (addedPatches.length > 0) {
        await deductPatchesForMaglia(addedPatches);
      }
    }

    const dbItem = toDbFormat(collection, item);

    const { data, error } = await supabase
      .from(collection)
      .update(dbItem)
      .eq('id', itemId)
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('PUT error:', error);
    return new Response(JSON.stringify({ error: 'Errore modifica elemento' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Ripristina inventario quando viene eliminata una vendita
async function restoreInventoryOnDeleteSale(vendita: any) {
  const { categoria, prodotto, prodotto_id, quantita, totale } = vendita;

  if (categoria === 'Patch') {
    // Cerca per ID (preferito) o nome prodotto
    let patch = null;

    if (prodotto_id) {
      const { data } = await supabase
        .from('patch')
        .select('*')
        .eq('id', prodotto_id)
        .single();
      patch = data;
    } else {
      // Fallback: cerca per nome (compatibilità con vecchie vendite)
      const { data: patches } = await supabase
        .from('patch')
        .select('*')
        .eq('prodotto', prodotto);
      patch = patches?.[0] || null;
    }

    if (patch) {
      const nuoviVenduti = Math.max(0, (patch.venduti || 0) - (quantita || 1));
      const nuovoRicavo = Math.max(0, (patch.ricavo_vendite || 0) - (totale || 0));
      const nuovoProfitto = nuovoRicavo - (patch.costo_unitario * nuoviVenduti);

      await supabase
        .from('patch')
        .update({
          venduti: nuoviVenduti,
          in_magazzino: patch.quantita_iniziale - nuoviVenduti,
          ricavo_vendite: nuovoRicavo,
          profitto: nuovoProfitto
        })
        .eq('id', patch.id);
    }
  } else if (categoria === 'Tuta') {
    // Ripristina la tuta per ID o nome
    let tuta = null;

    if (prodotto_id) {
      const { data } = await supabase
        .from('tute')
        .select('*')
        .eq('id', prodotto_id)
        .single();
      tuta = data;
    } else {
      const { data: tute } = await supabase
        .from('tute')
        .select('*')
        .eq('stato', 'Venduto');
      if (tute) {
        tuta = tute.find(t =>
          prodotto.toLowerCase().includes(t.squadra.toLowerCase())
        ) || null;
      }
    }

    if (tuta) {
      await supabase
        .from('tute')
        .update({
          stato: 'In magazzino',
          prezzo_vendita: 0,
          profitto: 0
        })
        .eq('id', tuta.id);
    }
  } else if (categoria === 'Maglia') {
    // Ripristina la maglia per ID o nome
    let maglia = null;

    if (prodotto_id) {
      const { data } = await supabase
        .from('maglie')
        .select('*')
        .eq('id', prodotto_id)
        .single();
      maglia = data;
    } else {
      const { data: maglie } = await supabase
        .from('maglie')
        .select('*')
        .eq('stato', 'Venduta');
      if (maglie) {
        maglia = maglie.find(m => {
          const nomeCompleto = `${m.maglia} ${m.stagione}`.toLowerCase();
          return prodotto.toLowerCase() === nomeCompleto;
        }) || maglie.find(m =>
          prodotto.toLowerCase().includes(m.maglia.toLowerCase())
        ) || null;
      }
    }

    if (maglia) {
      await supabase
        .from('maglie')
        .update({
          stato: 'In magazzino',
          prezzo_vendita: 0,
          profitto: 0
        })
        .eq('id', maglia.id);
    }
  }
}

// DELETE - Elimina elemento
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { collection, index } = await request.json();

    // Per le vendite, usa lo stesso ordinamento della tabella (per data decrescente)
    let vendita = null;
    let maglia = null;
    let itemId = null;

    if (collection === 'vendite') {
      const { data: vendite } = await supabase
        .from('vendite')
        .select('*')
        .order('data', { ascending: false });
      if (vendite && index >= 0 && index < vendite.length) {
        vendita = vendite[index];
        itemId = vendita.id;
      }
    } else if (collection === 'maglie') {
      // Per le maglie, recupera i dati per ripristinare le patch
      const { data: items } = await supabase.from(collection).select('*');
      if (items && index >= 0 && index < items.length) {
        maglia = items[index];
        itemId = items[index].id;
      }
    } else {
      // Per altre collezioni, prendi l'ID dall'indice
      const { data: items } = await supabase.from(collection).select('id');
      if (items && index >= 0 && index < items.length) {
        itemId = items[index].id;
      }
    }

    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Elemento non trovato' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabase
      .from(collection)
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    // Se era una vendita, ripristina l'inventario
    if (collection === 'vendite' && vendita) {
      await restoreInventoryOnDeleteSale(vendita);
    }

    // Se era una maglia con patch, ripristina l'inventario delle patch
    if (collection === 'maglie' && maglia && maglia.patch_ids) {
      let patchIdsToRestore: number[] = [];
      try {
        const parsed = typeof maglia.patch_ids === 'string'
          ? JSON.parse(maglia.patch_ids)
          : maglia.patch_ids;
        if (Array.isArray(parsed)) {
          patchIdsToRestore = parsed.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
        }
      } catch {}
      if (patchIdsToRestore.length > 0) {
        await restorePatchesFromMaglia(patchIdsToRestore);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return new Response(JSON.stringify({ error: 'Errore eliminazione elemento' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
