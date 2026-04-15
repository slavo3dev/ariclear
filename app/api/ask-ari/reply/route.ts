// app/api/ask-ari/reply/route.ts
//
// Admin-only endpoint for posting expert replies as Ari.
// Uses the service role key → bypasses RLS → can write to any question.
//
// Add to your .env.local:
//   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
//   NEXT_PUBLIC_ADMIN_EMAILS=you@example.com,colleague@example.com

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Service role client — never expose this key on the frontend
function getServiceClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL!;
	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
	if (!url || !serviceKey)
		throw new Error('Missing Supabase service role env vars');
	return createClient(url, serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

// Auth-aware server client — used only to verify the caller is an admin.
// cookies() is async in Next.js 15+ — must be awaited.
async function getServerClient() {
	const cookieStore = await cookies(); // ← fixed: await required in Next.js 15+
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

function isAdmin(email: string | undefined): boolean {
	if (!email) return false;
	const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
		.split(',')
		.map((e) => e.trim());
	return adminEmails.includes(email);
}

export async function POST(req: NextRequest) {
	try {
		// 1. Verify the caller is authenticated
		const serverClient = await getServerClient(); // ← await because function is now async
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

		// 2. Verify the caller is an admin
		if (!isAdmin(user.email)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// 3. Parse and validate body
		const body = await req.json();
		const { question_id, content } = body as {
			question_id?: string;
			content?: string;
		};

		if (!question_id || !content?.trim()) {
			return NextResponse.json(
				{ error: 'question_id and content are required' },
				{ status: 400 },
			);
		}

		// 4. Insert comment as Ari using service role (bypasses RLS).
		//    is_expert: true is the permanent flag — every Ari answer is stored here.
		//    You can pull a full history of all expert replies at any time:
		//      select * from comments where is_expert = true order by created_at desc;
		const serviceClient = getServiceClient();

		const { data: comment, error: insertError } = await serviceClient
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

		if (insertError) throw insertError;

		// 5. Update question status to "answered"
		const { error: updateError } = await serviceClient
			.from('questions')
			.update({ status: 'answered' })
			.eq('id', question_id);

		if (updateError) {
			console.warn(
				'Failed to update question status:',
				updateError.message,
			);
			// Non-fatal — comment was saved, status update can be retried
		}

		return NextResponse.json({ comment }, { status: 201 });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('[/api/ask-ari/reply]', message);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
