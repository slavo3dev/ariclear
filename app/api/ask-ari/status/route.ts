// app/api/ask-ari/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

function getUrl() {
	return (process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL ?? '').replace(
		/\/$/,
		'',
	);
}

async function getServerClient() {
	const cookieStore = await cookies();
	return createServerClient(
		getUrl(),
		process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_ANON_KEY!,
		{ cookies: { get: (name) => cookieStore.get(name)?.value } },
	);
}

function getServiceClient() {
	const url = getUrl();
	const key = process.env.SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY ?? '';
	if (!url || !key)
		throw new Error('Missing SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY');
	return createClient(url, key, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

export async function PATCH(req: NextRequest) {
	try {
		const serverClient = await getServerClient();
		const {
			data: { user },
			error: authError,
		} = await serverClient.auth.getUser();
		if (authError || !user) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const { data: adminRow } = await serverClient
			.from('admin_users')
			.select('id')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.maybeSingle();

		if (!adminRow) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { question_id, status } = (await req.json()) as {
			question_id?: string;
			status?: string;
		};

		if (!question_id || !['waiting', 'answered'].includes(status ?? '')) {
			return NextResponse.json(
				{ error: 'question_id and valid status required' },
				{ status: 400 },
			);
		}

		const { error } = await getServiceClient()
			.from('questions')
			.update({ status })
			.eq('id', question_id);

		if (error) throw error;

		return NextResponse.json({ success: true, status });
	} catch (err: unknown) {
		const message =
			err instanceof Error
				? err.message
				: typeof err === 'object' && err !== null && 'message' in err
					? String((err as { message: unknown }).message)
					: JSON.stringify(err);
		console.error('[/api/ask-ari/status] error:', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
