'use client';

// Shown after Stripe Checkout. The plan is granted by the webhook, which can
// arrive a few seconds after the redirect, so poll /api/subscription until the
// plan shows up. Never grants anything itself.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTierLabel } from '@/lib/plans';
import type { PublicEntitlements } from '@/lib/entitlements';

const POLL_MS = 2_000;
const MAX_POLLS = 20; // ~40 seconds

type State =
	| { kind: 'waiting' }
	| { kind: 'active'; ent: PublicEntitlements }
	| { kind: 'slow' }
	| { kind: 'signed-out' };

export function PlanActivation() {
	const [state, setState] = useState<State>({ kind: 'waiting' });

	useEffect(() => {
		let cancelled = false;
		let polls = 0;
		let timer: ReturnType<typeof setTimeout> | undefined;

		const check = async () => {
			polls += 1;
			try {
				const res = await fetch('/api/subscription', { cache: 'no-store' });
				if (res.status === 401) {
					if (!cancelled) setState({ kind: 'signed-out' });
					return;
				}
				if (res.ok) {
					const ent = (await res.json()) as PublicEntitlements;
					if (ent.isPaid && !ent.isComp) {
						if (!cancelled) setState({ kind: 'active', ent });
						return;
					}
				}
			} catch {
				/* retry below */
			}
			if (cancelled) return;
			if (polls >= MAX_POLLS) {
				setState({ kind: 'slow' });
				return;
			}
			timer = setTimeout(check, POLL_MS);
		};

		check();
		return () => {
			cancelled = true;
			if (timer) clearTimeout(timer);
		};
	}, []);

	if (state.kind === 'active') {
		const until = state.ent.expiresAt
			? new Date(state.ent.expiresAt).toLocaleDateString('en-US', {
					dateStyle: 'long',
				})
			: null;
		return (
			<div className='rounded-3xl border border-green-200 bg-white p-8 text-center shadow-sm'>
				<p className='text-4xl'>🎉</p>
				<h1 className='mt-3 text-2xl font-semibold text-choco-900'>
					You&apos;re a {getTierLabel(state.ent.tier)}
				</h1>
				<p className='mt-2 text-sm text-choco-700'>
					{state.ent.websitesLimit} website
					{state.ent.websitesLimit === 1 ? '' : 's'}, re-scans, the
					rewrite tester, technical checks and PDF reports
					{until ? <> until {until}</> : null}. A receipt is on its way
					to your email.
				</p>
				<div className='mt-6 flex flex-col justify-center gap-2 sm:flex-row'>
					<Link
						href='/scan'
						className='rounded-full bg-choco-900 px-5 py-2.5 text-sm font-semibold text-cream-50 hover:bg-choco-800'>
						Scan a website
					</Link>
					<Link
						href='/dashboard'
						className='rounded-full border border-choco-200 bg-cream-50 px-5 py-2.5 text-sm font-medium text-choco-800 hover:bg-choco-50'>
						Go to dashboard
					</Link>
				</div>
			</div>
		);
	}

	if (state.kind === 'signed-out') {
		return (
			<div className='rounded-3xl border border-choco-100 bg-white p-8 text-center shadow-sm'>
				<h1 className='text-2xl font-semibold text-choco-900'>
					Payment received
				</h1>
				<p className='mt-2 text-sm text-choco-700'>
					Sign in with the account you paid from to see your plan.
				</p>
				<Link
					href='/'
					className='mt-6 inline-block rounded-full bg-choco-900 px-5 py-2.5 text-sm font-semibold text-cream-50 hover:bg-choco-800'>
					Back to AriClear
				</Link>
			</div>
		);
	}

	if (state.kind === 'slow') {
		return (
			<div className='rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm'>
				<h1 className='text-2xl font-semibold text-choco-900'>
					Payment received, still activating
				</h1>
				<p className='mt-2 text-sm text-choco-700'>
					Stripe confirmed your payment, but your plan is taking longer
					than usual to switch on. Refresh this page in a minute. If it
					still hasn&apos;t changed, email{' '}
					<a
						className='underline'
						href='mailto:hello@ariclear.com?subject=Plan%20not%20activated'>
						hello@ariclear.com
					</a>{' '}
					and we&apos;ll fix it right away.
				</p>
			</div>
		);
	}

	return (
		<div className='rounded-3xl border border-choco-100 bg-white p-8 text-center shadow-sm'>
			<div className='mx-auto h-8 w-8 animate-spin rounded-full border-2 border-choco-200 border-t-choco-800' />
			<h1 className='mt-4 text-2xl font-semibold text-choco-900'>
				Payment received
			</h1>
			<p className='mt-2 text-sm text-choco-700'>
				Activating your plan. This usually takes a few seconds…
			</p>
		</div>
	);
}
