import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

export function createClient(request) {
  const headers = new Headers()

  const envProcess = typeof globalThis !== "undefined" && globalThis.process ? globalThis.process.env : undefined;
  const url = envProcess?.VITE_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL;
  const publishableKey = envProcess?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;

  const supabase = createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            headers.append('Set-Cookie', serializeCookieHeader(name, value, options)))
        },
      },
    }
  )

  return { supabase, headers }
}
