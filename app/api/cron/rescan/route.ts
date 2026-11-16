// GET /api/cron/rescan
// Scheduled re-scan of paid users' sites (Vercel Cron, see vercel.json).
//
// * Protected: Vercel sends "Authorization: Bearer $CRON_SECRET". Without
//   CRON_SECRET set, the route is disabled.
// * Picks sites of ACTIVE paid plans whose last scan is older than
//   RESCAN_MIN_AGE_DAYS (default 7), oldest first (due_rescans() in SQL),
//   and runs the same pipeline as a manual scan (lib/analysis/runScan).
// * Each new scan is saved with record_scan(), so it shows up in History and
//   the trend like any other scan.
// * Sends the score digest when the user has not opted out and an email
//   provider is configured (lib/email).
// * Works in small batches within the function time limit; whatever is left
//   is picked up on the next run.

import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAriClearAdmin } from '@/lib/supabase/admin';
import { runScan } from '@/lib/analysis/runScan';
import { claimScanLimits } from '@/lib/entitlements';
import { getEntitlements, recordScan } from '@/lib/entitlements.server';
import { buildDigest } from '@/lib/email/digest';
import { emailProvider, sendEmail } from '@/lib/email';
import { unsubscribeUrl } from '@/lib/email/unsubscribe';
import { createLogger, errorCode } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const log = createLogger('cron/rescan');

const BATCH = Math.min(50, Math.max(1, Number(process.env.RESCAN_BATCH) || 10));
const MIN_AGE_DAYS = Math.max(1, Number(process.env.RESCAN_MIN_AGE_DAYS) || 7);
const CONCURRENCY = 2;
/** Stop starting new scans after this, so the run ends inside maxDuration. */
const TIME_BUDGET_MS = 230_000;

type Due = { user_id: string; domain: string; url: string };
type Outcome = 'scanned' | 'failed' | 'skipped';

function authorized(req: NextRequest): boolean {
	const secret = process.env.CRON_SECRET;
	if (!secret) return false;
	const given = Buffer.from(req.headers.get('authorization') ?? '');
	const expected = Buffer.from(`Bearer ${secret}`);
	return given.length === expected.length && timingSafeEqual(given, expected);
}

type ScoreSet = { overall: number; human: number; ai: number };

async function latestScores(userId: string, domain: string): Promise<ScoreSet | null> {
	const { data } = await supabaseAriClearAdmin()
		.from('scans')
		.select('overall_score, human_score, ai_score')
		.eq('user_id', userId)
		.eq('domain', domain)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	return data
		? { overall: data.overall_score, human: data.human_score, ai: data.ai_score }
		: null;
}

async function sendDigest(
	site: Due,
	scanId: string,
	before: ScoreSet | null,
	after: ScoreSet,
	topFix: string | null,
): Promise<boolean> {
	if (!emailProvider()) return false;
	const admin = supabaseAriClearAdmin();

	const { data: sub } = await admin
		.from('user_subscriptions')
		.select('email_digest')
		.eq('user_id', site.user_id)
		.maybeSingle();
	if (!sub?.email_digest) return false;

	const unsub = unsubscribeUrl(site.user_id);
	if (!unsub) return false; // no signing secret: never send without a working opt-out

	const { data: u } = await admin.auth.admin.getUserById(site.user_id);
	const to = u?.user?.email;
	if (!to) return false;

	const mail = buildDigest({ domain: site.domain, scanId, before, after, topFix, unsubscribeUrl: unsub });
	return (await sendEmail({ to, ...mail, unsubscribeUrl: unsub })) === 'sent';
}

async function rescanOne(site: Due): Promise<{ outcome: Outcome; emailed: boolean }> {
	const ent = await getEntitlements(site.user_id);
	if (!ent.isPaid) return { outcome: 'skipped', emailed: false };

	const before = await latestScores(site.user_id, site.domain);

	let scan;
	try {
		scan = await runScan(site.url);
	} catch (err) {
		log.warn('scan failed', { code: errorCode(err) });
		// Move the site to the back of the queue so one broken site cannot
		// block the others; it is retried after the normal interval.
		await supabaseAriClearAdmin()
			.from('user_websites')
			.update({ last_scanned_at: new Date().toISOString() })
			.eq('user_id', site.user_id)
			.eq('domain', site.domain);
		return { outcome: 'failed', emailed: false };
	}

	const saved = await recordScan(site.user_id, site.domain, site.url, claimScanLimits(ent), scan.row);
	if (saved.status !== 'ok') return { outcome: 'skipped', emailed: false };

	const after = {
		overall: Math.round((scan.report.human.clarityScore + scan.report.ai.aiSeoScore) / 2),
		human: scan.report.human.clarityScore,
		ai: scan.report.ai.aiSeoScore,
	};
	const firstIssue = (scan.report.human.topIssues as Array<{ issue?: string }>)[0]?.issue ?? null;

	let emailed = false;
	try {
		emailed = await sendDigest(site, saved.scanId, before, after, firstIssue);
	} catch (err) {
		log.warn('digest failed', { code: errorCode(err) });
	}
	return { outcome: 'scanned', emailed };
}

export async function GET(req: NextRequest) {
	if (!process.env.CRON_SECRET) {
		return NextResponse.json({ error: 'Cron is not configured' }, { status: 503 });
	}
	if (!authorized(req)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const started = Date.now();
	const { data, error } = await supabaseAriClearAdmin().rpc('due_rescans', {
		p_limit: BATCH,
		p_min_age: `${MIN_AGE_DAYS} days`,
	});
	if (error) {
		log.error('due_rescans failed', { code: error.code ?? 'unknown' });
		return NextResponse.json({ error: 'Could not load sites' }, { status: 500 });
	}

	const queue = [...((data ?? []) as Due[])];
	const counts = { due: queue.length, scanned: 0, failed: 0, skipped: 0, emailed: 0, deferred: 0 };

	const worker = async () => {
		while (queue.length) {
			if (Date.now() - started > TIME_BUDGET_MS) {
				counts.deferred += queue.length;
				queue.length = 0;
				return;
			}
			const site = queue.shift()!;
			try {
				const r = await rescanOne(site);
				counts[r.outcome]++;
				if (r.emailed) counts.emailed++;
			} catch (err) {
				counts.failed++;
				log.error('site failed', { code: errorCode(err) });
			}
		}
	};
	await Promise.all(Array.from({ length: CONCURRENCY }, worker));

	log.info('run finished', { ...counts, ms: Date.now() - started });
	return NextResponse.json(counts);
}
