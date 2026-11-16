import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { supabaseAriClearAdmin } from '@/lib/supabase/admin';
import { createLogger, errorCode } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

const log = createLogger('scans/id');

type ChecklistItem = { id: string; label: string; checked: boolean };

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
	} catch (err) {
		log.error('get failed', { code: errorCode(err) });
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}

// PATCH /api/scans/[id] - Tick or untick checklist items.
// Body: { checklist: [{ id, checked }] }. Only the `checked` flag of items
// that already exist on the scan can change; labels and the item list are
// set by the server when the scan is saved. Users cannot UPDATE scans
// directly, so this writes with the service role after an ownership check.
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
		const incoming: unknown = body?.checklist;
		if (!Array.isArray(incoming) || incoming.length > 100) {
			return NextResponse.json(
				{ error: 'Missing checklist data' },
				{ status: 400 },
			);
		}

		const wanted = new Map<string, boolean>();
		for (const item of incoming) {
			if (
				item &&
				typeof item === 'object' &&
				typeof (item as ChecklistItem).id === 'string' &&
				typeof (item as ChecklistItem).checked === 'boolean'
			) {
				wanted.set((item as ChecklistItem).id, (item as ChecklistItem).checked);
			}
		}

		// Ownership check with the user's own client (RLS applies).
		const { data: scan, error: fetchError } = await supabase
			.from('scans')
			.select('id, checklist')
			.eq('id', id)
			.eq('user_id', user.id)
			.single();

		if (fetchError || !scan) {
			return NextResponse.json(
				{ error: 'Scan not found' },
				{ status: 404 },
			);
		}

		const current: ChecklistItem[] = Array.isArray(scan.checklist)
			? scan.checklist
			: [];
		const checklist = current.map((item) =>
			wanted.has(item.id) ? { ...item, checked: wanted.get(item.id)! } : item,
		);

		const { data, error } = await supabaseAriClearAdmin()
			.from('scans')
			.update({ checklist })
			.eq('id', id)
			.eq('user_id', user.id)
			.select()
			.single();

		if (error || !data) {
			log.error('update failed', { code: error?.code ?? 'no_row' });
			return NextResponse.json(
				{ error: 'Failed to update scan' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ scan: data });
	} catch (err) {
		log.error('update failed', { code: errorCode(err) });
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
			log.error('delete failed', { code: deleteError.code ?? 'unknown' });
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
	} catch (err) {
		log.error('delete failed', { code: errorCode(err) });
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
