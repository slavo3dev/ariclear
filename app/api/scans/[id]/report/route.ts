// GET /api/scans/[id]/report
// Report data for the PDF download on a saved scan. Paid feature: free
// accounts get 403 UPGRADE_REQUIRED. The PDF itself is drawn in the browser
// from this data (lib/report/pdf.ts).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { featureDenial } from '@/lib/entitlements';
import { getEntitlements } from '@/lib/entitlements.server';
import { reportFromScan, type SavedScanRow } from '@/lib/report/build';
import type { ChecklistItem } from '@/lib/report/types';

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

	try {
		const denied = featureDenial(await getEntitlements(user.id), 'pdf');
		if (denied) return NextResponse.json(denied, { status: 403 });
	} catch {
		return NextResponse.json(
			{ error: 'Could not load your plan. Please try again.' },
			{ status: 500 },
		);
	}

	const { data: scan, error } = await supabase
		.from('scans')
		.select('*')
		.eq('id', id)
		.eq('user_id', user.id)
		.single();

	if (error || !scan) {
		return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
	}

	const report = reportFromScan(scan as SavedScanRow);
	const saved = Array.isArray(scan.checklist) ? scan.checklist : [];
	const checklist: ChecklistItem[] = saved.map(
		(c: { id: string; label: string; checked?: boolean }) => ({
			id: c.id,
			label: c.label,
			checked: Boolean(c.checked),
			issueId: c.id,
		}),
	);

	return NextResponse.json({ report, checklist });
}
