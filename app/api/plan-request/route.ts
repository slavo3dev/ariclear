// app/api/plan-request/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
	const url = (process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL ?? '').replace(
		/\/$/,
		'',
	);
	const key = process.env.SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY;
	if (!url || !key)
		throw new Error('Missing SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY env var');
	return createClient(url, key, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { email, phone, plan, websites, url, notes, sourceUrl } = body;

		if (!email || !plan || !websites) {
			return NextResponse.json(
				{ error: 'Missing required fields: email, plan, websites' },
				{ status: 400 },
			);
		}

		if (!['pro', 'expert'].includes(plan)) {
			return NextResponse.json(
				{ error: 'Invalid plan. Must be pro or expert.' },
				{ status: 400 },
			);
		}

		const supabase = getServiceClient();

		const { error } = await supabase.from('plan_requests').upsert(
			{
				email: email.trim().toLowerCase(),
				phone: phone?.trim() || null,
				plan,
				websites: Number(websites),
				url: url?.trim() || null,
				notes: notes?.trim() || null,
				source_url: sourceUrl || null,
			},
			{
				onConflict: 'email,plan',
				ignoreDuplicates: false,
			},
		);

		if (error) {
			console.error('[plan-request] insert error:', error);
			return NextResponse.json(
				{ error: 'Failed to save request' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true }, { status: 201 });
	} catch (err) {
		console.error('[plan-request] unexpected error:', err);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
