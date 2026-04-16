// app/api/ask-ari/questions/route.ts
//
// Fetches all questions with their comments for the authenticated user.
// Admins see all questions; regular users see only their own (via RLS).
// Session from cookies ensures the correct JWT is attached to every query.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function getServerClient() {
	const cookieStore = await cookies();
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_ANON_KEY!,
		{
			cookies: {
				get(name: string) {
					return cookieStore.get(name)?.value;
				},
			},
		},
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
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const { data, error } = await serverClient
			.from('questions')
			.select('*, comments(*)')
			.order('created_at', { ascending: false });

		if (error) throw error;

		return NextResponse.json({ questions: data ?? [] });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('[/api/ask-ari/questions]', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}