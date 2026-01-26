import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file || !file.name) {
      return new Response(JSON.stringify({ error: 'Nessun file caricato' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Genera nome file unico
    const ext = path.extname(file.name);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomStr}${ext}`;

    // Percorso di salvataggio
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    const filePath = path.join(uploadDir, fileName);

    // Assicurati che la directory esista
    await fs.mkdir(uploadDir, { recursive: true });

    // Salva il file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // Restituisci il percorso pubblico
    const publicPath = `/uploads/${fileName}`;

    return new Response(JSON.stringify({ success: true, path: publicPath }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Errore upload:', error);
    return new Response(JSON.stringify({ error: 'Errore durante l\'upload' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
