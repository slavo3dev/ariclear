// app/api/admin/ask-ari/status/route.ts
//
// PATCH — toggle a question's status between 'waiting' and 'answered'.
// Only callable by users confirmed in the admin_users table.

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

export async function PATCH(req: Request) {
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

		const { question_id, status } = await req.json();
		if (!question_id || !['waiting', 'answered'].includes(status)) {
			return NextResponse.json(
				{ error: 'Invalid payload' },
				{ status: 400 },
			);
		}

		const service = getServiceClient();
		const { error } = await service
			.from('questions')
			.update({ status })
			.eq('id', question_id);

		if (error) throw error;

		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error('[admin/ask-ari/status]', err);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
