import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const titolo = String(body.titolo ?? '').trim();
    const link = String(body.link ?? '').trim();
    if (!titolo) return json({ error: 'Titolo obbligatorio' }, 400);

    const { data, error } = await supabase
      .from('richieste')
      .insert({ titolo, link })
      .select()
      .single();
    if (error) throw error;
    return json({ success: true, data });
  } catch (error) {
    console.error('POST richieste error:', error);
    return json({ error: 'Errore aggiunta richiesta' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const id = Number((await request.json()).id);
    if (!id) return json({ error: 'ID mancante' }, 400);

    const { error } = await supabase.from('richieste').delete().eq('id', id);
    if (error) throw error;
    return json({ success: true });
  } catch (error) {
    console.error('DELETE richieste error:', error);
    return json({ error: 'Errore eliminazione richiesta' }, 500);
  }
};
