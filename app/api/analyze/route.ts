// POST /api/analyze
// Runs a full scan for a signed-in user and SAVES it. The report stored in
// `scans` is the one built on the server (lib/analysis/runScan); the browser
// never sends scores. Claiming the scan (plan limits) and saving it happen in
// one database transaction (record_scan()).

import { NextResponse } from 'next/server';
import { runScan, ScanError } from '@/lib/analysis/runScan';
import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { rateLimit } from '@/lib/security/rateLimit';
import { claimScanLimits, scanDenial } from '@/lib/entitlements';
import {
	getEntitlements,
	recordScan,
	EntitlementsUnavailableError,
} from '@/lib/entitlements.server';
import { createLogger, errorCode } from '@/lib/logger';
import { normalizeDomain } from '@/lib/domain';

export const runtime = 'nodejs';
// A two-model scan (GPT and Claude review, then Claude merges) takes about
// 1-2 minutes; see lib/analysis/claudeScan for the per-step limits.
export const maxDuration = 300;

const log = createLogger('analyze');

function isValidHttpUrl(input: string) {
	try {
		const u = new URL(input);
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

export async function POST(req: Request) {
	try {
		// Auth: every scan costs an LLM call, so it requires a signed-in user.
		const supabase = await supabaseAriClearServer();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const limit = await rateLimit(`analyze:${user.id}`, 10, 60_000);
		if (!limit.ok) {
			return NextResponse.json(
				{ error: 'Too many scans. Please wait a moment.', rateLimited: true },
				{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
			);
		}

		const { url } = ((await req.json().catch(() => ({}))) ?? {}) as {
			url?: string;
		};
		if (!url || !isValidHttpUrl(url)) {
			return NextResponse.json(
				{ error: 'Please provide a valid http(s) URL.' },
				{ status: 400 },
			);
		}

		// www.example.com and example.com are the same site.
		const domain = normalizeDomain(url);

		// Refuse before spending a model call. record_scan() below is the
		// real, atomic gate.
		const ent = await getEntitlements(user.id);
		const denied = scanDenial(ent, domain);
		if (denied) return NextResponse.json(denied, { status: 403 });

		const scan = await runScan(url);

		// Count the scan, reserve the site slot and save the report atomically.
		// Parallel requests that all passed the pre-check stop here; only the
		// allowed number of them are saved and returned.
		const saved = await recordScan(user.id, domain, url, claimScanLimits(ent), scan.row);
		if (saved.status !== 'ok') {
			const fresh = await getEntitlements(user.id);
			const denial = scanDenial(fresh, domain);
			return NextResponse.json(
				denial ?? { error: 'Could not reserve this scan. Please try again.' },
				{ status: denial ? 403 : 409 },
			);
		}

		return NextResponse.json({ ...scan.report, scanId: saved.scanId });
	} catch (err) {
		if (err instanceof ScanError) {
			return NextResponse.json(
				{ error: err.message, ...(err.kind === 'rate_limited' ? { rateLimited: true } : {}) },
				{ status: err.status },
			);
		}
		if (err instanceof EntitlementsUnavailableError) {
			log.error('plan or save unavailable');
			return NextResponse.json(
				{ error: 'Could not load your plan. Please try again.' },
				{ status: 500 },
			);
		}
		log.error('failed', { code: errorCode(err) });
		return NextResponse.json(
			{ error: 'Server error while analyzing the URL.' },
			{ status: 500 },
		);
	}
}
