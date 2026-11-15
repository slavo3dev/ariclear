// GET /api/scans/limit
// What the scan page needs to know before the user presses Analyze.
// `limitReached` = no scan is possible at all (free scan used, or plan ended).
// A paid user whose sites are full can still re-scan those sites
// (`canAddSite` is false, `domains` lists them).

import { NextResponse } from 'next/server';
import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { getEntitlements } from '@/lib/entitlements.server';
import { publicEntitlements } from '@/lib/entitlements';

export async function GET() {
	const supabase = await supabaseAriClearServer();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const ent = await getEntitlements(user.id);
		return NextResponse.json({
			...publicEntitlements(ent),
			limit: ent.websitesLimit,
			current: ent.websitesUsed,
			limitReached: !ent.canScan,
		});
	} catch {
		return NextResponse.json(
			{ error: 'Could not load your plan. Please try again.' },
			{ status: 500 },
		);
	}
}
