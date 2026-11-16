'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthModal, DemoScanSection, useAuth } from '@ariclear/components';

/** Only same-site relative paths (blocks //evil.com and absolute URLs). */
function safeNext(raw: string | null): string | null {
	if (!raw) return null;
	return raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\')
		? raw
		: null;
}

export function HomePageClient() {
	const router = useRouter();
	const { user } = useAuth();
	const [authOpen, setAuthOpen] = useState(false);
	const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
	const nextRef = useRef<string | null>(null);
	/** True while the sign-in prompt from proxy.ts (?signin=1) is open. */
	const fromPromptRef = useRef(false);

	// proxy.ts sends signed-out visitors of guarded pages to /?signin=1&next=…
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get('signin') !== '1') return;
		nextRef.current = safeNext(params.get('next'));
		fromPromptRef.current = true;
		queueMicrotask(() => {
			setAuthMode('login');
			setAuthOpen(true);
		});
	}, []);

	// After signing in from the sign-in prompt, return to the page they asked
	// for, or to the dashboard (the signed-in home).
	useEffect(() => {
		if (user && fromPromptRef.current) {
			fromPromptRef.current = false;
			const next = nextRef.current ?? '/dashboard';
			nextRef.current = null;
			router.replace(next);
		}
	}, [user, router]);

	const openSignup = () => {
		setAuthMode('signup');
		setAuthOpen(true);
	};

	return (
		<>
			<DemoScanSection onSignUpClick={openSignup} />
			<AuthModal
				key={authMode}
				open={authOpen}
				initialMode={authMode}
				onClose={() => setAuthOpen(false)}
			/>
		</>
	);
}
