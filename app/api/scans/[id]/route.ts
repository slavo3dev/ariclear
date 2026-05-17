import { supabaseAriClearServer } from '@ariclear/lib/supabase/auth/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/scans/[id] - Get a single scan
export async function GET(
	request: NextRequest,
	segmentData: { params: Promise<{ id: string }> },
) {
	try {
		console.log('API: GET /api/scans/[id] called');

		const supabase = await supabaseAriClearServer();
		const params = await segmentData.params;
		const { id } = params;

		console.log('API: Fetching scan with ID:', id);

		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		console.log('API: User ID:', user?.id);
		console.log('API: Auth error:', authError);

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

		console.log('API: Scan found:', !!data);
		console.log('API: Error:', error);

		if (error || !data) {
			return NextResponse.json(
				{ error: 'Scan not found' },
				{ status: 404 },
			);
		}

		return NextResponse.json({ scan: data });
	} catch (error) {
		console.error('Server error:', error);
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
		const params = await segmentData.params;
		const { id } = params;

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
		const { checklist } = body;

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
			console.error('Update error:', error);
			return NextResponse.json(
				{ error: 'Failed to update scan' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ scan: data });
	} catch (error) {
		console.error('Server error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}

// DELETE /api/scans/[id] - Delete a scan, free website slot if it was the last for that domain
export async function DELETE(
	request: NextRequest,
	segmentData: { params: Promise<{ id: string }> },
) {
	try {
		const supabase = await supabaseAriClearServer();
		const params = await segmentData.params;
		const { id } = params;

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

		// Delete the scan
		const { error: deleteError } = await supabase
			.from('scans')
			.delete()
			.eq('id', id)
			.eq('user_id', user.id);

		if (deleteError) {
			console.error('Error deleting scan:', deleteError);
			return NextResponse.json(
				{ error: 'Failed to delete scan' },
				{ status: 500 },
			);
		}

		// Check if any scans remain for this domain
		const { count } = await supabase
			.from('scans')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.eq('domain', scan.domain);

		let websiteSlotFreed = false;

		// No scans left for this domain — remove the website slot
		if ((count ?? 0) === 0) {
			const { error: websiteDeleteError } = await supabase
				.from('user_websites')
				.delete()
				.eq('user_id', user.id)
				.eq('domain', scan.domain);

			if (!websiteDeleteError) {
				websiteSlotFreed = true;
				console.log('Website slot freed for domain:', scan.domain);
			} else {
				console.error(
					'Failed to free website slot:',
					websiteDeleteError,
				);
			}
		}

		return NextResponse.json({
			success: true,
			websiteSlotFreed,
			domain: scan.domain,
		});
	} catch (error) {
		console.error('Server error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
