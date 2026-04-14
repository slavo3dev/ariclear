// app/api/ask-ari/comment/route.ts

import { NextRequest, NextResponse } from 'next/server';
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

function extractMessage(err: unknown): string {
	if (err instanceof Error) return err.message;
	if (typeof err === 'object' && err !== null && 'message' in err) {
		return String((err as { message: unknown }).message);
	}
	return JSON.stringify(err);
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

		const { question_id, author_name, content } = (await req.json()) as {
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

		if (insertError) {
			console.error(
				'[comment] insert error:',
				JSON.stringify(insertError, null, 2),
			);
			throw insertError;
		}

		return NextResponse.json({ comment: data }, { status: 201 });
	} catch (err: unknown) {
		const message = extractMessage(err);
		console.error('[/api/ask-ari/comment] error:', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
