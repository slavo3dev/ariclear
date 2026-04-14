// app/api/ask-ari/check-admin/route.ts

import { NextResponse } from 'next/server';
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

export async function GET() {
	try {
		const serverClient = await getServerClient();
		const {
			data: { user },
			error: authError,
		} = await serverClient.auth.getUser();
		if (authError || !user) {
			return NextResponse.json({ isAdmin: false });
		}

		const { data } = await serverClient
			.from('admin_users')
			.select('id')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.maybeSingle();

		return NextResponse.json({ isAdmin: !!data });
	} catch {
		return NextResponse.json({ isAdmin: false });
	}
}
