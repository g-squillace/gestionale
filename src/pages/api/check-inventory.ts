import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

function parsePatchIds(patchIds: any): number[] {
  if (!patchIds) return [];
  if (Array.isArray(patchIds)) return patchIds.map(Number).filter(id => !isNaN(id));
  if (typeof patchIds === 'string') {
    try {
      const parsed = JSON.parse(patchIds);
      if (Array.isArray(parsed)) return parsed.map(Number).filter(id => !isNaN(id));
    } catch {}
  }
  return [];
}

async function loadData() {
  const [patchRes, venditeRes, maglieRes] = await Promise.all([
    supabase.from('patch').select('*').order('prodotto'),
    supabase.from('vendite').select('*').eq('categoria', 'Patch'),
    supabase.from('maglie').select('*'),
  ]);
  return {
    patches: patchRes.data || [],
    vendite: venditeRes.data || [],
    maglie: maglieRes.data || [],
  };
}

function computeExpected(patch: any, vendite: any[], maglie: any[]) {
  const lottoLabel = patch.lotto ? ` [${patch.lotto}]` : '';
  const fullName = patch.prodotto + lottoLabel;

  // Vendite dirette di questa patch
  const patchVendite = vendite.filter((v: any) =>
    v.prodotto_id === patch.id ||
    v.prodotto === fullName ||
    v.prodotto === patch.prodotto
  );
  const venditeCount = patchVendite.reduce((s: number, v: any) => s + (v.quantita || 1), 0);
  const ricavo = patchVendite.reduce((s: number, v: any) => s + (v.totale || 0), 0);

  // Utilizzo in maglie
  let maglieCount = 0;
  for (const m of maglie) {
    const ids = parsePatchIds(m.patch_ids);
    maglieCount += ids.filter((id: number) => id === patch.id).length;
  }

  const totalVenduti = venditeCount + maglieCount;

  return {
    venduti: totalVenduti,
    in_magazzino: patch.quantita_iniziale - totalVenduti,
    ricavo_vendite: ricavo,
    profitto: ricavo - (patch.costo_unitario * venditeCount),
  };
}

// GET: controlla discrepanze senza modificare
export const GET: APIRoute = async () => {
  try {
    const { patches, vendite, maglie } = await loadData();
    const discrepancies: any[] = [];

    for (const patch of patches) {
      const expected = computeExpected(patch, vendite, maglie);
      const campi: any[] = [];

      if (patch.venduti !== expected.venduti) {
        campi.push({ campo: 'venduti', attuale: patch.venduti, atteso: expected.venduti });
      }
      if (patch.in_magazzino !== expected.in_magazzino) {
        campi.push({ campo: 'in_magazzino', attuale: patch.in_magazzino, atteso: expected.in_magazzino });
      }
      if (Math.abs((patch.ricavo_vendite || 0) - expected.ricavo_vendite) > 0.01) {
        campi.push({ campo: 'ricavo_vendite', attuale: patch.ricavo_vendite || 0, atteso: expected.ricavo_vendite });
      }
      if (Math.abs((patch.profitto || 0) - expected.profitto) > 0.01) {
        campi.push({ campo: 'profitto', attuale: patch.profitto || 0, atteso: expected.profitto });
      }

      if (campi.length > 0) {
        discrepancies.push({
          patchId: patch.id,
          prodotto: patch.prodotto,
          lotto: patch.lotto || null,
          campi,
        });
      }
    }

    return new Response(JSON.stringify({ discrepancies }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Check inventory error:', error);
    return new Response(JSON.stringify({ error: 'Errore verifica inventario' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: correggi tutte le discrepanze
export const POST: APIRoute = async () => {
  try {
    const { patches, vendite, maglie } = await loadData();
    const corrections: any[] = [];

    for (const patch of patches) {
      const expected = computeExpected(patch, vendite, maglie);

      const needsUpdate =
        patch.venduti !== expected.venduti ||
        patch.in_magazzino !== expected.in_magazzino ||
        Math.abs((patch.ricavo_vendite || 0) - expected.ricavo_vendite) > 0.01 ||
        Math.abs((patch.profitto || 0) - expected.profitto) > 0.01;

      if (needsUpdate) {
        const { error } = await supabase
          .from('patch')
          .update({
            venduti: expected.venduti,
            in_magazzino: expected.in_magazzino,
            ricavo_vendite: expected.ricavo_vendite,
            profitto: expected.profitto,
          })
          .eq('id', patch.id);

        if (!error) {
          corrections.push({
            patchId: patch.id,
            prodotto: patch.prodotto,
            lotto: patch.lotto || null,
            corretto: {
              venduti: { da: patch.venduti, a: expected.venduti },
              in_magazzino: { da: patch.in_magazzino, a: expected.in_magazzino },
              ricavo_vendite: { da: patch.ricavo_vendite || 0, a: expected.ricavo_vendite },
              profitto: { da: patch.profitto || 0, a: expected.profitto },
            },
          });
        }
      }
    }

    return new Response(JSON.stringify({ corrections, count: corrections.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fix inventory error:', error);
    return new Response(JSON.stringify({ error: 'Errore correzione inventario' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
