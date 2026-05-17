// app/api/video/request/route.ts
// Saves a video render job to the video_jobs Supabase table.
// Status starts as "pending" — Step 6 will pick it up for actual rendering.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAriClearServer } from '@ariclear/lib/supabase/auth/server';

export async function POST(request: NextRequest) {
	try {
		const supabase = await supabaseAriClearServer();

		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 },
			);
		}

		const body = await request.json();
		const { scan_id, url, style, format, script } = body;

		if (!url || !style || !format || !script) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 },
			);
		}

		// Check if user already has a pending/rendering job for this scan
		// to avoid duplicate requests
		if (scan_id) {
			const { data: existing } = await supabase
				.from('video_jobs')
				.select('id, status')
				.eq('user_id', user.id)
				.eq('scan_id', scan_id)
				.in('status', ['pending', 'rendering'])
				.maybeSingle();

			if (existing) {
				return NextResponse.json(
					{
						error: 'A render job for this scan is already in progress.',
					},
					{ status: 409 },
				);
			}
		}

		const { data, error } = await supabase
			.from('video_jobs')
			.insert({
				user_id: user.id,
				scan_id: scan_id ?? null,
				url,
				style,
				format,
				script,
				status: 'pending',
			})
			.select('id, status')
			.single();

		if (error) {
			console.error('[video/request] insert error:', error);
			return NextResponse.json(
				{ error: 'Failed to create video job.' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ job: data }, { status: 201 });
	} catch (err) {
		console.error('[video/request] server error:', err);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
