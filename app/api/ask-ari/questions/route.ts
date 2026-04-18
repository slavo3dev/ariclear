// app/api/ask-ari/questions/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function getServerClient() {
	const cookieStore = await cookies();
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_ANON_KEY!,
		{ cookies: { get: (name) => cookieStore.get(name)?.value } },
	);
}

function getServiceClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) return null; // ← never throw, return null so caller can fallback
	return createClient(url, key, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

export async function GET() {
	try {
		// ── Step 1: verify authenticated ──────────────────────────────────────
		const serverClient = await getServerClient();
		const { data: { user }, error: authError } = await serverClient.auth.getUser();

		if (authError || !user) {
			console.error('[questions] auth error:', authError?.message ?? 'no user');
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// ── Step 2: check admin (non-fatal if table missing or key absent) ─────
		let isAdmin = false;
		const service = getServiceClient();

		if (service) {
			try {
				const { data: adminRow } = await serverClient
					.from('admin_users')
					.select('id')
					.eq('user_id', user.id)
					.eq('is_active', true)
					.maybeSingle();
				isAdmin = !!adminRow;
			} catch (e) {
				console.warn('[questions] admin check threw — treating as regular user:', e);
			}
		} else {
			console.warn('[questions] SUPABASE_SERVICE_ROLE_KEY not set — skipping admin path');
		}

		// ── Step 3a: admin with service client — fetch ALL questions ──────────
		if (isAdmin && service) {
			const { data: questions, error: qError } = await service
				.from('questions')
				.select('*, comments(*)')
				.order('created_at', { ascending: false });

			if (qError) {
				console.error('[questions] admin fetch error:', qError.message);
				// Fall through to regular user path rather than returning 500
			} else {
				// Enrich with emails (best-effort — never crash if this fails)
				const emailMap: Record<string, string> = {};
				try {
					const { data: authUsers } = await service.auth.admin.listUsers();
					for (const u of authUsers?.users ?? []) {
						emailMap[u.id] = u.email ?? u.id;
					}
				} catch (e) {
					console.warn('[questions] listUsers failed — emails will be null:', e);
				}

				const enriched = (questions ?? []).map((q: { user_id: string }) => ({
					...q,
					user_email: emailMap[q.user_id] ?? null,
				}));

				return NextResponse.json({ questions: enriched, isAdmin: true });
			}
		}

		// ── Step 3b: regular user — RLS filters to own questions only ─────────
		const { data, error } = await serverClient
			.from('questions')
			.select('*, comments(*)')
			.order('created_at', { ascending: false });

		if (error) {
			console.error('[questions] user fetch error:', error.message);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ questions: data ?? [], isAdmin: false });

	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[/api/ask-ari/questions] unhandled error:', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}