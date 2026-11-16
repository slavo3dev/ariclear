/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('scans');

// GET /api/scans - Get all scans for the authenticated user
export async function GET(request: NextRequest) {
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

		// Query parameters for filtering and sorting
		const { searchParams } = new URL(request.url);
		const filter = searchParams.get('filter');
		const sortBy = searchParams.get('sortBy') || 'date';

		let query = supabase.from('scans').select('*').eq('user_id', user.id);

		if (filter === 'recent') {
			const weekAgo = new Date();
			weekAgo.setDate(weekAgo.getDate() - 7);
			query = query.gte('created_at', weekAgo.toISOString());
		} else if (filter === 'low-score') {
			query = query.lt('overall_score', 70);
		}

		if (sortBy === 'score') {
			query = query.order('overall_score', { ascending: false });
		} else {
			query = query.order('created_at', { ascending: false });
		}

		const limitParam = Number(searchParams.get('limit'));
		if (Number.isInteger(limitParam) && limitParam > 0) {
			query = query.limit(Math.min(limitParam, 100));
		}

		const { data, error } = await query;

		if (error) {
			log.error('list failed', { code: error.code ?? 'unknown' });
			return NextResponse.json(
				{ error: 'Failed to fetch scans' },
				{ status: 500 },
			);
		}

		// Fields the dashboard list expects (derived; saved scans are always complete)
		const scans = (data || []).map((s: any) => ({
			...s,
			status: 'completed',
			issues_found: Array.isArray(s.issues) ? s.issues.length : 0,
		}));

		return NextResponse.json({ scans });
	} catch {
		log.error('list failed: unexpected');
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}

// There is no POST: /api/analyze saves every scan itself (record_scan()),
// so the browser cannot submit its own report or scores.
