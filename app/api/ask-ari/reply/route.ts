// app/api/ask-ari/reply/route.ts
//
// Admin-only endpoint for posting expert replies as Ari.
// Admin check uses the admin_users table (DB-authoritative) —
// NOT the NEXT_PUBLIC_ADMIN_EMAILS env var which was the old approach.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function getServerClient() {
	const cookieStore = await cookies();
	const url = (process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL ?? '').replace(
		/\/$/,
		'',
	);
	return createServerClient(
		url,
		process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_ANON_KEY!,
		{ cookies: { get: (name) => cookieStore.get(name)?.value } },
	);
}

function getServiceClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL?.replace(
		/\/$/,
		'',
	); // strip trailing slash
	const key = process.env.SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY; // ← your actual env var name
	if (!url || !key)
		throw new Error('Missing SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY env var');
	return createClient(url, key, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

export async function POST(req: NextRequest) {
	try {
		// 1. Verify authenticated
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

		// 2. Verify admin via DB — same check used everywhere else
		const { data: adminRow } = await serverClient
			.from('admin_users')
			.select('id')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.maybeSingle();

		if (!adminRow) {
			return NextResponse.json(
				{ error: 'Forbidden — admin only' },
				{ status: 403 },
			);
		}

		// 3. Validate body
		const { question_id, content } = (await req.json()) as {
			question_id?: string;
			content?: string;
		};

		if (!question_id || !content?.trim()) {
			return NextResponse.json(
				{ error: 'question_id and content are required' },
				{ status: 400 },
			);
		}

		// 4. Insert expert reply using service role (bypasses RLS)
		const service = getServiceClient();

		console.log('[reply] inserting comment for question:', question_id);
		const { data: comment, error: insertError } = await service
			.from('comments')
			.insert({
				question_id,
				author_id: user.id,
				author_name: 'Ari',
				content: content.trim(),
				is_expert: true,
			})
			.select()
			.single();

		if (insertError) {
			console.error(
				'[reply] insert error:',
				JSON.stringify(insertError, null, 2),
			);
			throw insertError;
		}

		// 5. Mark question as answered (non-fatal if this fails)
		const { error: updateError } = await service
			.from('questions')
			.update({ status: 'answered' })
			.eq('id', question_id);

		if (updateError) {
			console.warn('[reply] status update failed:', updateError.message);
		}

		return NextResponse.json({ comment }, { status: 201 });
	} catch (err: unknown) {
		// Supabase errors are plain objects, not Error instances — extract message properly
		const message =
			err instanceof Error
				? err.message
				: typeof err === 'object' && err !== null && 'message' in err
					? String((err as { message: unknown }).message)
					: JSON.stringify(err);
		console.error('[/api/ask-ari/reply] error detail:', message);
		console.error(
			'[/api/ask-ari/reply] full error:',
			JSON.stringify(err, null, 2),
		);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
