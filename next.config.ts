import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Supabase auth token mutexes can log "orphaned lock" under StrictMode double-mount in dev.
  reactStrictMode: false,

  allowedDevOrigins: [
    '3000-01jm80mqjydsp9mp2w836b7ghe.cloudspaces.litng.ai',
  ],

  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
  },
};

export default nextConfig;
