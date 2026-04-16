// app/api/ask-ari/comment/route.ts
//
// Handles follow-up comments from users on their own questions.
// Session is read from cookies server-side so RLS passes correctly.

import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
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

		const body = await req.json();
		const { question_id, author_name, content } = body as {
			question_id?: string;
			author_name?: string;
			content?: string;
		};

		if (!question_id || !content?.trim()) {
			return NextResponse.json(
				{ error: 'question_id and content are required' },
				{ status: 400 },
			);
		}

		const { data, error: insertError } = await serverClient
			.from('comments')
			.insert({
				question_id,
				author_id: user.id,
				author_name: author_name ?? user.email?.split('@')[0] ?? 'User',
				content: content.trim(),
				is_expert: false,
			})
			.select()
			.single();

		if (insertError) throw insertError;

		return NextResponse.json({ comment: data }, { status: 201 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('[/api/ask-ari/comment]', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}