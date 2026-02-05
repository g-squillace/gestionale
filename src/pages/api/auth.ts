import type { APIRoute } from 'astro';

// Credenziali (semplici, come richiesto)
const VALID_USERNAME = 'susta';
const VALID_PASSWORD = 'waquilone';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      // Imposta il cookie di autenticazione (valido per 7 giorni)
      cookies.set('auth', 'authenticated', {
        path: '/',
        httpOnly: true,
        secure: false, // Cambia a true in produzione con HTTPS
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 giorni
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Credenziali non valide' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Errore del server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Logout
export const DELETE: APIRoute = async ({ cookies }) => {
  cookies.delete('auth', { path: '/' });
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
