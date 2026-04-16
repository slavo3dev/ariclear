// app/api/ask-ari/question/route.ts
//
// Handles new question submissions from users.
// Using a server route means the session is read from cookies server-side
// and attached to the Supabase request — no 401 from missing JWT.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Auth-aware server client — reads session from cookies
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

export async function POST(req: NextRequest) {
	try {
		const serverClient = await getServerClient();

		// Verify session
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

		const body = await req.json();
		const { title, url, message } = body as {
			title?: string;
			url?: string;
			message?: string;
		};

		if (!title?.trim() || !message?.trim()) {
			return NextResponse.json(
				{ error: 'title and message are required' },
				{ status: 400 },
			);
		}

		// Insert using the authenticated server client — session is attached,
		// RLS passes because user_id matches auth.uid()
		const { data, error: insertError } = await serverClient
			.from('questions')
			.insert({
				user_id: user.id,
				title: title.trim(),
				url: url?.trim() || null,
				message: message.trim(),
				status: 'waiting',
			})
			.select()
			.single();

		if (insertError) throw insertError;

		return NextResponse.json({ question: data }, { status: 201 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('[/api/ask-ari/question]', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}