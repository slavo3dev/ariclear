'use client';

// useCheckout: start a Stripe Checkout for a 6-month plan.
// Signed-out visitors are asked to create a free account first (the caller
// renders <AuthModal open={authOpen} ...>).

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { PaidTier } from '@/lib/entitlements';
import { useAuth } from '../providers/AuthProvider';

export function useCheckout() {
	const { user, loading } = useAuth();
	const [pending, setPending] = useState<PaidTier | null>(null);
	const [authOpen, setAuthOpen] = useState(false);

	const start = async (plan: PaidTier) => {
		if (loading || pending) return;
		if (!user) {
			toast('Create your free account first, then choose your plan.', {
				icon: '👋',
			});
			setAuthOpen(true);
			return;
		}

		setPending(plan);
		try {
			const res = await fetch('/api/billing/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ plan }),
			});
			const json = await res.json().catch(() => ({}));
			if (res.ok && typeof json.url === 'string') {
				window.location.assign(json.url);
				return; // keep the button in its pending state while we leave
			}
			if (res.status === 401) {
				setAuthOpen(true);
			} else {
				toast.error(json.error ?? 'Could not start checkout.');
			}
		} catch {
			toast.error('Network error. Please try again.');
		}
		setPending(null);
	};

	return {
		start,
		pending,
		authOpen,
		closeAuth: () => setAuthOpen(false),
	};
}
