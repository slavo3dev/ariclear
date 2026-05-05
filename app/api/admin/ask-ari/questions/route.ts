// app/api/admin/ask-ari/questions/route.ts
//
// GET — returns ALL questions from ALL users, enriched with user emails.
// Only callable by users confirmed in the admin_users table.
// Uses service role to bypass RLS.

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
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
		{ auth: { autoRefreshToken: false, persistSession: false } },
	);
}

export async function GET() {
	try {
		const serverClient = await getServerClient();
		const {
			data: { user },
			error: authError,
		} = await serverClient.auth.getUser();
		if (authError || !user)
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 },
			);

		const { data: adminRow } = await serverClient
			.from('admin_users')
			.select('id')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.maybeSingle();

		if (!adminRow)
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

		const service = getServiceClient();

		const { data: questions, error } = await service
			.from('questions')
			.select('*, comments(*)')
			.order('created_at', { ascending: false });

		if (error) throw error;

		// Enrich with user emails
		const emailMap: Record<string, string> = {};
		const { data: authUsers } = await service.auth.admin.listUsers();
		if (authUsers?.users) {
			for (const u of authUsers.users) {
				emailMap[u.id] = u.email ?? u.id;
			}
		}

		const enriched = (questions ?? []).map((q: { user_id: string }) => ({
			...q,
			user_email:
				emailMap[(q as { user_id: string }).user_id] ?? 'Unknown',
		}));

		return NextResponse.json({ questions: enriched });
	} catch (err) {
		console.error('[admin/ask-ari/questions]', err);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
