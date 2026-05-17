// app/scan/[id]/page.tsx
// Server component — fetches scan on the server, no useEffect needed.
// Only the interactive parts (copy button, video panel) are client components.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Navbar, SiteFooter } from '@ariclear/components';
import { ScanResultsClient } from './ScanResultsClient';

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

// ─── Server-side Supabase ─────────────────────────────────────────────────────

async function getSupabase() {
	const cookieStore = await cookies();
	const url = process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL!;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_ANON_KEY!;

	return createServerClient(url, key, {
		cookies: {
			get: (name) => cookieStore.get(name)?.value,
		},
	});
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ScanResultPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const supabase = await getSupabase();

	// Check auth server-side — redirect if not logged in
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/');
	}

	// Fetch scan server-side — no API round-trip needed
	const { data: scan, error } = await supabase
		.from('scans')
		.select('*')
		.eq('id', id)
		.eq('user_id', user.id)
		.single();

	if (error || !scan) {
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

	return (
		<div className='flex min-h-screen flex-col bg-cream-50'>
			<Navbar />
			<main className='mx-auto w-full max-w-2xl flex-1 px-4 py-10'>
				<ScanResultsClient scan={scan as Scan} />
			</main>
			<SiteFooter />
		</div>
	);
}
