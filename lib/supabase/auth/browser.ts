// Browser Supabase client. Uses @supabase/ssr so it reads and writes the SAME
// cookie session as the server (sign-in happens server-side in
// /api/auth/login). It no longer keeps a separate session in localStorage.

import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_ANON_KEY;

if (!url || !anonKey) {
	throw new Error('Missing PUBLIC Supabase env vars.');
}

export const supabaseAriClear = createBrowserClient(url, anonKey);
