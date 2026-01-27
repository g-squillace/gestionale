import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Pagine pubbliche (login e API auth)
  if (pathname === '/login' || pathname === '/api/auth') {
    return next();
  }

  // Controlla il cookie di autenticazione
  const authCookie = context.cookies.get('auth');

  if (!authCookie || authCookie.value !== 'authenticated') {
    // Redirect al login se non autenticato
    return context.redirect('/login');
  }

  return next();
});
