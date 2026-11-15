import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/scans/[id] - Get a single scan
export async function GET(
	request: NextRequest,
	segmentData: { params: Promise<{ id: string }> },
) {
	try {
		const supabase = await supabaseAriClearServer();
		const { id } = await segmentData.params;

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

		const { data, error } = await supabase
			.from('scans')
			.select('*')
			.eq('id', id)
			.eq('user_id', user.id)
			.single();

		if (error || !data) {
			return NextResponse.json(
				{ error: 'Scan not found' },
				{ status: 404 },
			);
		}

		return NextResponse.json({ scan: data });
	} catch {
		console.error('[scans/id] get failed: unexpected');
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}

// PATCH /api/scans/[id] - Update a scan (e.g., checklist)
export async function PATCH(
	request: NextRequest,
	segmentData: { params: Promise<{ id: string }> },
) {
	try {
		const supabase = await supabaseAriClearServer();
		const { id } = await segmentData.params;

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

		const body = await request.json().catch(() => null);
		const checklist = body?.checklist;

		if (!checklist) {
			return NextResponse.json(
				{ error: 'Missing checklist data' },
				{ status: 400 },
			);
		}

		const { data, error } = await supabase
			.from('scans')
			.update({ checklist })
			.eq('id', id)
			.eq('user_id', user.id)
			.select()
			.single();

		if (error || !data) {
			console.error('[scans/id] update failed:', error?.code ?? 'no row');
			return NextResponse.json(
				{ error: 'Failed to update scan' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ scan: data });
	} catch {
		console.error('[scans/id] update failed: unexpected');
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}

// DELETE /api/scans/[id] - Delete a scan.
// When it was the last scan of its site, the database trigger
// cleanup_user_website_on_scan_delete frees the site slot. Users cannot touch
// user_websites directly. Deleting never refunds a scan: the lifetime counter
// in user_subscriptions is not decremented.
export async function DELETE(
	request: NextRequest,
	segmentData: { params: Promise<{ id: string }> },
) {
	try {
		const supabase = await supabaseAriClearServer();
		const { id } = await segmentData.params;

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

		// Fetch the scan first so we know its domain (and verify ownership)
		const { data: scan, error: fetchError } = await supabase
			.from('scans')
			.select('id, domain')
			.eq('id', id)
			.eq('user_id', user.id)
			.single();

		if (fetchError || !scan) {
			return NextResponse.json(
				{ error: 'Scan not found' },
				{ status: 404 },
			);
		}

		const { error: deleteError } = await supabase
			.from('scans')
			.delete()
			.eq('id', id)
			.eq('user_id', user.id);

		if (deleteError) {
			console.error('[scans/id] delete failed:', deleteError.code ?? 'unknown');
			return NextResponse.json(
				{ error: 'Failed to delete scan' },
				{ status: 500 },
			);
		}

		// Did the trigger free the slot?
		const { count } = await supabase
			.from('user_websites')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.eq('domain', scan.domain);

		return NextResponse.json({
			success: true,
			websiteSlotFreed: (count ?? 0) === 0,
			domain: scan.domain,
		});
	} catch {
		console.error('[scans/id] delete failed: unexpected');
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
