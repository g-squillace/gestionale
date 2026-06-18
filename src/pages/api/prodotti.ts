import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function sanitize(item: Record<string, unknown>) {
  return {
    tipo: item.tipo === 'nameset' ? 'nameset' : 'patch',
    titolo: String(item.titolo ?? '').trim(),
    descrizione: String(item.descrizione ?? '').trim(),
    prezzo_acquisto: Number(item.prezzo_acquisto) || 0,
    quantita: Math.max(0, Math.trunc(Number(item.quantita) || 0)),
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const item = sanitize(await request.json());
    if (!item.titolo) return json({ error: 'Titolo obbligatorio' }, 400);

    const { data, error } = await supabase.from('prodotti').insert(item).select().single();
    if (error) throw error;
    return json({ success: true, data });
  } catch (error) {
    console.error('POST prodotti error:', error);
    return json({ error: 'Errore aggiunta prodotto' }, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!id) return json({ error: 'ID mancante' }, 400);

    const item = sanitize(body);
    if (!item.titolo) return json({ error: 'Titolo obbligatorio' }, 400);

    const { data, error } = await supabase.from('prodotti').update(item).eq('id', id).select().single();
    if (error) throw error;
    return json({ success: true, data });
  } catch (error) {
    console.error('PUT prodotti error:', error);
    return json({ error: 'Errore modifica prodotto' }, 500);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const id = Number(body.id);
    const delta = Math.trunc(Number(body.delta) || 0);
    if (!id || !delta) return json({ error: 'Parametri non validi' }, 400);

    const { data: current, error: readError } = await supabase
      .from('prodotti')
      .select('quantita')
      .eq('id', id)
      .single();
    if (readError) throw readError;

    const quantita = Math.max(0, (current?.quantita ?? 0) + delta);
    const { data, error } = await supabase
      .from('prodotti')
      .update({ quantita })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return json({ success: true, data });
  } catch (error) {
    console.error('PATCH prodotti error:', error);
    return json({ error: 'Errore aggiornamento quantità' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const id = Number((await request.json()).id);
    if (!id) return json({ error: 'ID mancante' }, 400);

    const { error } = await supabase.from('prodotti').delete().eq('id', id);
    if (error) throw error;
    return json({ success: true });
  } catch (error) {
    console.error('DELETE prodotti error:', error);
    return json({ error: 'Errore eliminazione prodotto' }, 500);
  }
};
