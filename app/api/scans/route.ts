/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import {
	getEntitlements,
	EntitlementsUnavailableError,
} from '@/lib/entitlements.server';

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
			console.error('[scans] list failed:', error.code ?? 'unknown');
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
		console.error('[scans] list failed: unexpected');
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}

// POST /api/scans - Save the report that /api/analyze just produced.
//
// /api/analyze is the gate: it checks the plan and atomically claims the scan
// (site slot + lifetime counter) before returning a report. Saving is only
// allowed for a site that was claimed, and only while the user has fewer saved
// scans than claimed scans, so this route cannot be used to get extra scans.
// (Phase 2 moves the save into /api/analyze itself and removes this route's
// trust in the browser-sent report.)
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

		const body = await request.json().catch(() => null);
		const analyzeResult = body?.analyzeResult;
		const url = body?.url;

		if (!analyzeResult || typeof url !== 'string' || !url) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 },
			);
		}

		let domain: string;
		try {
			domain = new URL(url).hostname;
		} catch {
			return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
		}

		const ent = await getEntitlements(user.id);

		if (!ent.domains.includes(domain)) {
			return NextResponse.json(
				{
					error: 'Scan this site first',
					errorCode: 'NOT_CLAIMED',
				},
				{ status: 403 },
			);
		}

		const { count, error: countError } = await supabase
			.from('scans')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', user.id);
		if (countError) {
			console.error('[scans] count failed:', countError.code ?? 'unknown');
			return NextResponse.json(
				{ error: 'Failed to save scan' },
				{ status: 500 },
			);
		}
		if ((count ?? 0) >= ent.scansUsed) {
			return NextResponse.json(
				{
					error: 'There is no unsaved scan to save',
					errorCode: 'NOTHING_TO_SAVE',
				},
				{ status: 403 },
			);
		}

		const humanScore = analyzeResult.human?.clarityScore ?? 0;
		const aiScore = analyzeResult.ai?.aiSeoScore ?? 0;
		const combinedScore = Math.round((humanScore + aiScore) / 2);

		const scanData = {
			user_id: user.id,
			domain,
			url,
			overall_score: combinedScore,
			human_score: humanScore,
			ai_score: aiScore,
			human_clarity_description:
				analyzeResult.human?.whatItSeemsLike || null,
			human_value_prop: analyzeResult.human?.oneSentenceValueProp || null,
			human_audience: analyzeResult.human?.bestGuessAudience || null,
			human_confusions: analyzeResult.human?.confusions || [],
			ai_comprehension: analyzeResult.ai?.aiSummary || null,
			ai_indexer_read: analyzeResult.ai?.indexerRead || null,
			ai_missing_keywords: analyzeResult.ai?.missingKeywords || [],
			suggested_headline: analyzeResult.copy?.suggestedHeadline || null,
			suggested_subheadline:
				analyzeResult.copy?.suggestedSubheadline || null,
			suggested_cta: analyzeResult.copy?.suggestedCTA || null,
			action_plan: analyzeResult.plan?.nextSteps || [],
			ai_prompt: analyzeResult.prompts?.aiSeoPrompt || null,
			issues: (analyzeResult.human?.topIssues ?? []).map(
				(issue: any, idx: number) => ({
					id: `issue-${idx}`,
					issue: issue.issue,
					whyItHurts: issue.whyItHurts,
					fix: issue.fix,
				}),
			),
			checklist: (analyzeResult.human?.topIssues ?? []).map(
				(issue: any, idx: number) => ({
					id: `issue-${idx}`,
					label: issue.issue,
					checked: false,
				}),
			),
			suggestions: analyzeResult.ai?.structuredDataSuggestions || [],
		};

		const { data, error } = await supabase
			.from('scans')
			.insert(scanData)
			.select()
			.single();

		if (error) {
			console.error('[scans] insert failed:', error.code ?? 'unknown');
			return NextResponse.json(
				{ error: 'Failed to save scan' },
				{ status: 500 },
			);
		}

		return NextResponse.json({ scan: data }, { status: 201 });
	} catch (error) {
		if (error instanceof EntitlementsUnavailableError) {
			return NextResponse.json(
				{ error: 'Could not load your plan. Please try again.' },
				{ status: 500 },
			);
		}
		console.error('[scans] save failed: unexpected');
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
