// scripts/eval/run.ts
// Score stability eval: how much do AriClear's scores move when the SAME page
// is scored several times?
//
// For each URL in golden-urls.json:
//   1. fetch the page once (same fetch as a real scan),
//   2. score that exact HTML N times with the production prompt and model
//      (lib/analysis/runScan -> modelReport), so page changes between runs
//      cannot blur the result,
//   3. run the deterministic technical checks once,
//   4. report mean, standard deviation (sample, n-1), min, max and range for
//      clarity, AI-SEO and overall, and flag any score where a run lands more
//      than THRESHOLD points from the mean ("unstable").
//
// Usage (from the repo root):
//   pnpm eval                       # all 30 URLs, 3 runs each
//   pnpm eval --n=5                 # 5 runs each
//   pnpm eval --only=stripe,ibm     # URLs containing any of these
//   pnpm eval --dry-run             # fetch + technical checks only, no model calls
//   pnpm eval --threshold=5 --concurrency=3
//   pnpm eval --mode=combined       # the two-model report (GPT + Claude, merged)
//
// --mode=gpt (default) scores with gpt-4o-mini alone: one call per run.
// --mode=combined runs the production two-model report (combinedReport):
// a GPT review, a Claude review and a Claude merge per run, and also records
// each reviewer's own scores, so GPT and Claude stability can be compared.
// It costs far more (roughly $0.20-0.30 per run) and takes 1-2 min per run.
//
// Needs OPENAI_API_KEY, and ANTHROPIC_API_KEY for --mode=combined (read from
// .env by the pnpm script).
// Results are written to scripts/eval/results/<timestamp>.json (gitignored).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { combinedReport, fetchPage, modelReport, ScanError } from '@/lib/analysis/runScan';
import type { AnalyzeModelReport } from '@/lib/analysis/scanRow';
import type { ReviewScores } from '@/lib/analysis/combineReports';
import { runTechnicalChecks } from '@/lib/analysis/technicalChecks';

type Tier = 'low' | 'mid' | 'high';
type GoldenUrl = { url: string; category: string; expect: Tier; note?: string };
type Run = {
	clarity: number;
	ai: number;
	overall: number;
	firstIssue: string | null;
	/** --mode=combined: each reviewer's own scores, and whether the merge ran. */
	reviews?: { gpt?: ReviewScores; claude?: ReviewScores };
	merged?: boolean;
};
type Stats = {
	mean: number;
	sd: number;
	min: number;
	max: number;
	range: number;
	/** Largest distance of any run from the mean. */
	maxDev: number;
};
type Result = {
	url: string;
	category: string;
	expect: Tier;
	status: 'ok' | 'fetch_failed' | 'model_failed' | 'dry_run';
	error?: string;
	technical: number | null;
	runs: Run[];
	stats?: { clarity: Stats; ai: Stats; overall: Stats };
	unstable: Array<'clarity' | 'ai' | 'overall'>;
	tier?: Tier;
};

// ─── args ──────────────────────────────────────────────────────────────────

function arg(name: string): string | undefined {
	const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
	if (!hit) return undefined;
	return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : 'true';
}

const N = Math.max(1, Number(arg('n')) || 3);
const THRESHOLD = Number(arg('threshold')) || 5;
const CONCURRENCY = Math.max(1, Number(arg('concurrency')) || 3);
const DRY_RUN = arg('dry-run') === 'true';
const MODE = arg('mode') === 'combined' ? 'combined' : 'gpt';
const ONLY = arg('only')
	?.split(',')
	.map((s) => s.trim().toLowerCase())
	.filter(Boolean);

const here = path.dirname(fileURLToPath(import.meta.url));

// ─── stats ─────────────────────────────────────────────────────────────────

const round1 = (x: number) => Math.round(x * 10) / 10;

function stats(xs: number[]): Stats {
	const n = xs.length;
	const mean = xs.reduce((a, b) => a + b, 0) / n;
	const variance = n > 1 ? xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1) : 0;
	const min = Math.min(...xs);
	const max = Math.max(...xs);
	return {
		mean: round1(mean),
		sd: round1(Math.sqrt(variance)),
		min,
		max,
		range: max - min,
		maxDev: round1(Math.max(...xs.map((x) => Math.abs(x - mean)))),
	};
}

function tierOf(score: number): Tier {
	return score >= 65 ? 'high' : score >= 40 ? 'mid' : 'low';
}

// ─── one URL ───────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function scoreOnce(url: string, html: string): Promise<Run> {
	for (let attempt = 0; ; attempt++) {
		try {
			let r: AnalyzeModelReport;
			let extra: Pick<Run, 'reviews' | 'merged'> = {};
			if (MODE === 'combined') {
				const c = await combinedReport(url, html);
				r = c.report;
				extra = { reviews: c.reviews, merged: c.merged };
			} else {
				r = await modelReport(url, html);
			}
			const clarity = r.human.clarityScore;
			const ai = r.ai.aiSeoScore;
			const issues = r.human.topIssues as Array<{ issue?: string }>;
			return {
				clarity,
				ai,
				overall: Math.round((clarity + ai) / 2), // same formula as the app
				firstIssue: issues[0]?.issue ?? null,
				...extra,
			};
		} catch (err) {
			if (err instanceof ScanError && err.kind === 'rate_limited' && attempt < 3) {
				await sleep(5_000 * (attempt + 1));
				continue;
			}
			throw err;
		}
	}
}

async function evalUrl(g: GoldenUrl): Promise<Result> {
	const base: Result = {
		url: g.url,
		category: g.category,
		expect: g.expect,
		status: 'ok',
		technical: null,
		runs: [],
		unstable: [],
	};

	let html: string;
	try {
		html = await fetchPage(g.url);
	} catch (err) {
		return { ...base, status: 'fetch_failed', error: (err as Error).message };
	}

	try {
		base.technical = (await runTechnicalChecks(g.url)).score;
	} catch {
		base.technical = null;
	}

	if (DRY_RUN) return { ...base, status: 'dry_run' };

	try {
		for (let i = 0; i < N; i++) base.runs.push(await scoreOnce(g.url, html));
	} catch (err) {
		return { ...base, status: 'model_failed', error: (err as Error).message };
	}

	const s = {
		clarity: stats(base.runs.map((r) => r.clarity)),
		ai: stats(base.runs.map((r) => r.ai)),
		overall: stats(base.runs.map((r) => r.overall)),
	};
	return {
		...base,
		stats: s,
		unstable: (['clarity', 'ai', 'overall'] as const).filter((k) => s[k].maxDev > THRESHOLD),
		tier: tierOf(s.overall.mean),
	};
}

// ─── report ────────────────────────────────────────────────────────────────

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const lpad = (s: string | number, n: number) => String(s).padStart(n);

function cell(st: Stats | undefined): string {
	if (!st) return lpad('—', 18);
	return lpad(`${st.mean} ±${st.sd} [${st.min}-${st.max}]`, 18);
}

function printReport(results: Result[]) {
	const host = (u: string) => new URL(u).hostname.replace(/^www\./, '');
	console.log(
		`\n${pad('site', 22)}${lpad('clarity', 18)}${lpad('ai-seo', 18)}${lpad('overall', 18)}${lpad('tech', 6)}  tier      flags`,
	);
	console.log('─'.repeat(118));
	for (const r of results) {
		const flags: string[] = [];
		if (r.status !== 'ok' && r.status !== 'dry_run') flags.push(`${r.status}: ${r.error}`);
		if (r.unstable.length) flags.push(`UNSTABLE ${r.unstable.join(',')}`);
		if (r.tier && r.tier !== r.expect) flags.push(`expected ${r.expect}`);
		console.log(
			`${pad(host(r.url), 22)}${cell(r.stats?.clarity)}${cell(r.stats?.ai)}${cell(r.stats?.overall)}` +
				`${lpad(r.technical ?? '—', 6)}  ${pad(r.tier ?? '—', 8)}  ${flags.join('; ')}`,
		);
	}

	const scored = results.filter((r) => r.stats);
	const failed = results.filter((r) => r.status === 'fetch_failed' || r.status === 'model_failed');
	console.log('─'.repeat(118));
	if (DRY_RUN) {
		console.log(`dry run: ${results.length - failed.length} reachable, ${failed.length} failed`);
		return;
	}
	const avg = (k: 'clarity' | 'ai' | 'overall') =>
		scored.length ? round1(scored.reduce((a, r) => a + r.stats![k].sd, 0) / scored.length) : 0;
	const worst = (k: 'clarity' | 'ai' | 'overall') =>
		scored.reduce((m, r) => Math.max(m, r.stats![k].range), 0);
	const unstable = scored.filter((r) => r.unstable.length);
	const offTier = scored.filter((r) => r.tier !== r.expect);
	console.log(
		`${scored.length} scored x ${N} runs, ${failed.length} failed\n` +
			`mean sd   clarity ${avg('clarity')}  ai ${avg('ai')}  overall ${avg('overall')}\n` +
			`max range clarity ${worst('clarity')}  ai ${worst('ai')}  overall ${worst('overall')}\n` +
			`unstable (a run > ±${THRESHOLD} from the mean): ${unstable.length}` +
			(unstable.length ? ` — ${unstable.map((r) => host(r.url)).join(', ')}` : '') +
			`\noff expected tier: ${offTier.length}` +
			(offTier.length
				? ` — ${offTier.map((r) => `${host(r.url)} (${r.tier}, expected ${r.expect})`).join(', ')}`
				: ''),
	);

	if (MODE === 'combined') printReviewerComparison(scored, host);
}

/** --mode=combined: how stable is each reviewer on its own, and how far apart are they? */
function printReviewerComparison(scored: Result[], host: (u: string) => string) {
	const sdOf = (xs: number[]) => (xs.length > 1 ? stats(xs).sd : 0);
	const rows = scored.map((r) => {
		const g = r.runs.flatMap((x) => (x.reviews?.gpt ? [x.reviews.gpt] : []));
		const c = r.runs.flatMap((x) => (x.reviews?.claude ? [x.reviews.claude] : []));
		const mean = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : NaN);
		const overall = (s: ReviewScores[]) => s.map((x) => (x.clarity + x.ai) / 2);
		return {
			site: host(r.url),
			gpt: mean(overall(g)),
			claude: mean(overall(c)),
			gptSd: sdOf(overall(g)),
			claudeSd: sdOf(overall(c)),
			merged: r.runs.filter((x) => x.merged).length,
		};
	});
	console.log(`\n${pad('site', 22)}${lpad('gpt overall', 14)}${lpad('claude overall', 16)}${lpad('gap', 6)}  merged`);
	for (const x of rows) {
		const gap = Number.isNaN(x.gpt) || Number.isNaN(x.claude) ? '—' : round1(Math.abs(x.gpt - x.claude));
		console.log(
			`${pad(x.site, 22)}${lpad(`${x.gpt} ±${x.gptSd}`, 14)}${lpad(`${x.claude} ±${x.claudeSd}`, 16)}${lpad(gap, 6)}  ${x.merged}/${N}`,
		);
	}
	const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
	console.log(
		`mean sd of overall   gpt ${avg(rows.map((x) => x.gptSd))}  claude ${avg(rows.map((x) => x.claudeSd))}\n` +
			`mean gpt-claude gap  ${avg(rows.filter((x) => !Number.isNaN(x.gpt) && !Number.isNaN(x.claude)).map((x) => Math.abs(x.gpt - x.claude)))}`,
	);
}

// ─── main ──────────────────────────────────────────────────────────────────

async function main() {
	const golden = JSON.parse(readFileSync(path.join(here, 'golden-urls.json'), 'utf8')) as {
		urls: GoldenUrl[];
	};
	const urls = ONLY
		? golden.urls.filter((g) => ONLY.some((o) => g.url.toLowerCase().includes(o)))
		: golden.urls;
	if (!urls.length) throw new Error('No URLs match --only');

	if (!DRY_RUN && !process.env.OPENAI_API_KEY) {
		throw new Error('OPENAI_API_KEY is not set (the pnpm script reads it from .env).');
	}
	if (!DRY_RUN && MODE === 'combined' && !process.env.ANTHROPIC_API_KEY) {
		throw new Error('ANTHROPIC_API_KEY is not set (needed for --mode=combined).');
	}

	console.log(
		DRY_RUN
			? `Dry run: fetching ${urls.length} URLs, no model calls.`
			: MODE === 'combined'
				? `Scoring ${urls.length} URLs x ${N} runs with the two-model report (3 calls per run).`
				: `Scoring ${urls.length} URLs x ${N} runs = ${urls.length * N} model calls (gpt-4o-mini).`,
	);

	const results: Result[] = new Array(urls.length);
	let next = 0;
	let done = 0;
	const worker = async () => {
		while (next < urls.length) {
			const i = next++;
			results[i] = await evalUrl(urls[i]);
			done++;
			process.stdout.write(`\r${done}/${urls.length} done`);
		}
	};
	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
	process.stdout.write('\n');

	printReport(results);

	if (!DRY_RUN) {
		const dir = path.join(here, 'results');
		mkdirSync(dir, { recursive: true });
		const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
		writeFileSync(
			file,
			JSON.stringify({ ranAt: new Date().toISOString(), mode: MODE, n: N, threshold: THRESHOLD, results }, null, 2),
		);
		console.log(`\nSaved ${path.relative(process.cwd(), file)}`);
	}
}

main().catch((err) => {
	console.error((err as Error).message);
	process.exit(1);
});
