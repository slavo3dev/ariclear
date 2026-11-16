// app/scan/[id]/page.tsx
// Server component — fetches the scan on the server.
// Passes both to ScanResultsClient as props.

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { Navbar, SiteFooter } from '@ariclear/components';
import { ScanResultsClient, type ScanAccess } from './ScanResultsClient';
import type { RewriteAttempt } from './RewriteTester';
import type { ChecklistEntry, ScanIssue } from './IssuesChecklist';
import { getEntitlements } from '@/lib/entitlements.server';

// A user's private report: never indexed, no canonical inherited from /scan.
export const metadata: Metadata = {
	title: 'Scan report — AriClear',
	robots: { index: false, follow: false },
	alternates: { canonical: null },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionStep = {
	title: string;
	impact: 'high' | 'medium' | 'low';
	effort: 'low' | 'medium' | 'high';
	details: string;
};

export type Scan = {
	id: string;
	url: string;
	domain: string;
	overall_score: number;
	human_score: number;
	ai_score: number;
	human_clarity_description: string | null;
	human_value_prop: string | null;
	human_audience: string | null;
	human_confusions: string[];
	ai_comprehension: string | null;
	ai_indexer_read: string | null;
	ai_missing_keywords: string[];
	suggested_headline: string | null;
	suggested_subheadline: string | null;
	suggested_cta: string | null;
	action_plan: ActionStep[];
	ai_prompt: string | null;
	issues: ScanIssue[] | null;
	checklist: ChecklistEntry[] | null;
	suggestions: string[] | null;
	technical_score: number | null;
	created_at: string;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ScanResultPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const supabase = await supabaseAriClearServer();

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect('/');

	// Fetch scan
	const { data: scan, error: scanError } = await supabase
		.from('scans')
		.select('*')
		.eq('id', id)
		.eq('user_id', user.id)
		.single();

	if (scanError || !scan) {
		return (
			<div className='flex min-h-screen flex-col bg-cream-50'>
				<Navbar />
				<main className='mx-auto w-full max-w-2xl flex-1 px-4 py-10'>
					<div className='rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700 ring-1 ring-red-200'>
						⚠ Scan not found or you don&apos;t have access to it.
					</div>
				</main>
				<SiteFooter />
			</div>
		);
	}

	// Which paid sections to show. Each paid API route enforces this again.
	let access: ScanAccess = {
		features: {
			rescan: false,
			rewriteTest: false,
			technicalChecks: false,
			pdf: false,
			trend: false,
		},
		isExpired: false,
	};
	try {
		const ent = await getEntitlements(user.id);
		access = { features: ent.features, isExpired: ent.isExpired };
	} catch {
		// Show the scan with paid sections locked rather than failing the page.
	}

	// Earlier "Test your rewrite" attempts (RLS: own rows only).
	let rewriteHistory: RewriteAttempt[] = [];
	if (access.features.rewriteTest) {
		const { data } = await supabase
			.from('rewrite_tests')
			.select('id, headline, subheadline, cta, before_score, after_score, created_at')
			.eq('scan_id', scan.id)
			.order('created_at', { ascending: false })
			.limit(20);
		rewriteHistory = (data ?? []) as RewriteAttempt[];
	}

	return (
		<div className='flex min-h-screen flex-col bg-cream-50'>
			<Navbar />
			<main className='mx-auto w-full max-w-2xl flex-1 px-4 py-10'>
				<ScanResultsClient
					scan={scan as Scan}
					access={access}
					rewriteHistory={rewriteHistory}
				/>
			</main>
			<SiteFooter />
		</div>
	);
}
