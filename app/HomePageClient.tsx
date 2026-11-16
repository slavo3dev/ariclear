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

	// proxy.ts sends signed-out visitors of guarded pages to /?signin=1&next=…
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get('signin') !== '1') return;
		nextRef.current = safeNext(params.get('next'));
		queueMicrotask(() => {
			setAuthMode('login');
			setAuthOpen(true);
		});
	}, []);

	// After signing in, return to the page they asked for.
	useEffect(() => {
		const next = nextRef.current;
		if (user && next) {
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
