// lib/supabase/admin.ts
// Service-role client for the AriClear project. SERVER ONLY: bypasses RLS.
// Use it only for writes that users must not be able to make themselves
// (claiming scans, applying purchases, reading entitlements).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function supabaseAriClearAdmin(): SupabaseClient {
	if (cached) return cached;

	const url = (process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL ?? '').replace(
		/\/$/,
		'',
	);
	const key = process.env.SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new Error(
			'Missing NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL or SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY',
		);
	}

	cached = createClient(url, key, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	return cached;
}
