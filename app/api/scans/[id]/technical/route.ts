// GET /api/scans/[id]/technical
// Runs the deterministic technical checks live against the scan's URL.
// Not persisted: the user fixes things and re-checks to see the current state.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { runTechnicalChecks } from '@/lib/analysis/technicalChecks';
import { UnsafeUrlError } from '@/lib/security/safeFetch';
import { rateLimit } from '@/lib/security/rateLimit';

export const runtime = 'nodejs';

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const supabase = await supabaseAriClearServer();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const limit = rateLimit(`technical:${user.id}`, 10, 60_000);
	if (!limit.ok) {
		return NextResponse.json(
			{ error: 'Too many checks. Please wait a moment.' },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
		);
	}

	const { data: scan, error } = await supabase
		.from('scans')
		.select('url')
		.eq('id', id)
		.eq('user_id', user.id)
		.single();

	if (error || !scan) {
		return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
	}

	try {
		const report = await runTechnicalChecks(scan.url);
		return NextResponse.json({ report });
	} catch (err) {
		if (err instanceof UnsafeUrlError) {
			return NextResponse.json({ error: err.message }, { status: 400 });
		}
		console.error('[technical] failed:', err);
		return NextResponse.json(
			{ error: 'Could not fetch that site to run the checks.' },
			{ status: 502 },
		);
	}
}
