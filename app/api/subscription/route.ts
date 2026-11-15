// GET /api/subscription
// The signed-in user's plan and usage. Read-only: the free row is created by
// the signup trigger (or by getEntitlements for older accounts), never here.

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
			// Field names the navbar and dashboard already read
			websites_limit: ent.websitesLimit,
			websites_used: ent.websitesUsed,
			websites_remaining: Math.max(0, ent.websitesLimit - ent.websitesUsed),
			can_scan: ent.canScan,
		});
	} catch {
		return NextResponse.json(
			{ error: 'Could not load your plan. Please try again.' },
			{ status: 500 },
		);
	}
}
