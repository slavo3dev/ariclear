// app/scan/[id]/page.tsx
// Server component — fetches scan + latest video job on the server.
// Passes both to ScanResultsClient as props.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Navbar, SiteFooter } from '@ariclear/components';
import { ScanResultsClient } from './ScanResultsClient';
import type { VideoJobStatus } from './VideoPlayer';

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
	created_at: string;
};

// ─── Supabase server client ───────────────────────────────────────────────────

async function getSupabase() {
	const cookieStore = await cookies();
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_ANON_KEY!,
		{ cookies: { get: (name) => cookieStore.get(name)?.value } },
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ScanResultPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const supabase = await getSupabase();

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

	// Fetch latest video job for this scan
	const { data: videoJob } = await supabase
		.from('video_jobs')
		.select('id, status, cloudinary_url, error_message')
		.eq('scan_id', id)
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	return (
		<div className='flex min-h-screen flex-col bg-cream-50'>
			<Navbar />
			<main className='mx-auto w-full max-w-2xl flex-1 px-4 py-10'>
				<ScanResultsClient
					scan={scan as Scan}
					videoJob={(videoJob as VideoJobStatus) ?? null}
				/>
			</main>
			<SiteFooter />
		</div>
	);
}
