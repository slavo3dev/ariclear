// app/api/ask-ari/question/route.ts

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

		const { title, url, message } = (await req.json()) as {
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

		if (insertError) {
			console.error(
				'[question] insert error:',
				JSON.stringify(insertError, null, 2),
			);
			throw insertError;
		}

		return NextResponse.json({ question: data }, { status: 201 });
	} catch (err: unknown) {
		const message = extractMessage(err);
		console.error('[/api/ask-ari/question] error:', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
