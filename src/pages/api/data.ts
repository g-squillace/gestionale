import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';

export const prerender = false;

const dataPath = path.join(process.cwd(), 'src/data/magazzino.json');

async function readData() {
  const content = await fs.readFile(dataPath, 'utf-8');
  return JSON.parse(content);
}

async function writeData(data: any) {
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

// GET - Leggi tutti i dati
export const GET: APIRoute = async () => {
  try {
    const data = await readData();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Errore lettura dati' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Aggiungi nuovo elemento
export const POST: APIRoute = async ({ request }) => {
  try {
    const { collection, item } = await request.json();
    const data = await readData();

    if (!data[collection]) {
      return new Response(JSON.stringify({ error: 'Collezione non trovata' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    data[collection].push(item);
    await writeData(data);

    return new Response(JSON.stringify({ success: true, data: data[collection] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
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
    const data = await readData();

    if (!data[collection] || index < 0 || index >= data[collection].length) {
      return new Response(JSON.stringify({ error: 'Elemento non trovato' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    data[collection][index] = item;
    await writeData(data);

    return new Response(JSON.stringify({ success: true, data: data[collection] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Errore modifica elemento' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Elimina elemento
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { collection, index } = await request.json();
    const data = await readData();

    if (!data[collection] || index < 0 || index >= data[collection].length) {
      return new Response(JSON.stringify({ error: 'Elemento non trovato' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    data[collection].splice(index, 1);
    await writeData(data);

    return new Response(JSON.stringify({ success: true, data: data[collection] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Errore eliminazione elemento' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
