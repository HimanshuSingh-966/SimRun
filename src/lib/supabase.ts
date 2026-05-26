import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Retries transient browser network failures and 429 Too Many Requests. */
function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const maxAttempts = 3;
  const baseDelayMs = 500;

  const run = async (attempt: number): Promise<Response> => {
    try {
      const response = await fetch(input, init);

      // Handle 429 Too Many Requests
      if (response.status === 429 && attempt < maxAttempts) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        return run(attempt + 1);
      }

      return response;
    } catch (err) {
      const isNetwork =
        err instanceof TypeError ||
        (typeof err === 'object' &&
          err !== null &&
          String((err as Error).message || '').toLowerCase().includes('failed to fetch'));

      if (isNetwork && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
        return run(attempt + 1);
      }
      throw err;
    }
  };

  return run(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
}

/** When true (default), Supabase keeps you signed in across page reloads via browser storage — not “auto login”, but restored session. */
const persistSession = process.env.NEXT_PUBLIC_SUPABASE_AUTH_PERSIST !== 'false';

/** Use sessionStorage so the session clears when the browser tab is closed (still survives refresh in that tab). */
const useSessionStorage = process.env.NEXT_PUBLIC_SUPABASE_AUTH_STORAGE === 'session';

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  global: {
    fetch: fetchWithRetry,
  },
  auth: {
    persistSession,
    autoRefreshToken: persistSession,
    ...(typeof window !== 'undefined' && persistSession
      ? { storage: useSessionStorage ? window.sessionStorage : window.localStorage }
      : {}),
  },
});
