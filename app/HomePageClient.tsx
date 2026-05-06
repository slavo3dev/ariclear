'use client';

import { useState } from 'react';
import { AuthModal, DemoScanSection } from '@ariclear/components';

export function HomePageClient() {
	const [authOpen, setAuthOpen] = useState(false);

	return (
		<>
			<DemoScanSection onSignUpClick={() => setAuthOpen(true)} />
			<AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
		</>
	);
}
