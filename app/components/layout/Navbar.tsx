'use client';

// app/components/layout/Navbar.tsx
// Two navbars in one component:
//   * signed out: the marketing nav (how it works, who it's for, demo, plans,
//     book a call, login);
//   * signed in: an app nav (Dashboard, History, New scan, plan + usage,
//     account menu). The logo goes to the dashboard, which is the signed-in
//     home (proxy.ts sends signed-in visitors of "/" there).

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Button, useAuth, AuthModal } from '@ariclear/components';
import { getTierBadgeColor, getTierLabel } from '@/lib/plans';
import { createLogger, errorCode } from '@/lib/logger';

const log = createLogger('navbar');

const CALENDLY_URL = 'https://calendly.com/slavo3/30min';

type SubscriptionInfo = {
	tier: string;
	isPaid: boolean;
	isExpired: boolean;
	websites_limit: number;
	websites_used: number;
	can_scan: boolean;
};

const APP_TABS = [
	{ href: '/dashboard', label: 'Dashboard' },
	{ href: '/history', label: 'History' },
] as const;

function usageColor(used: number, limit: number) {
	const pct = limit > 0 ? (used / limit) * 100 : 0;
	if (pct >= 100) return 'bg-red-500';
	if (pct >= 70) return 'bg-orange-500';
	return 'bg-green-500';
}

function Logo({ href }: { href: string }) {
	return (
		<Link
			href={href}
			className='group inline-flex items-center gap-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-choco-400'
			aria-label={href === '/' ? 'Go to homepage' : 'Go to your dashboard'}>
			<div className='flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-choco-800 shadow-soft transition group-hover:bg-choco-900'>
				<Image
					src='/branding/arilogo-optimized.png'
					alt='AriClear logo'
					width={36}
					height={36}
					priority
					className='object-contain'
				/>
			</div>
			<span className='text-lg font-semibold tracking-tight text-choco-900'>
				AriClear
			</span>
		</Link>
	);
}

/** What the upgrade button says, or null when there is nothing to upgrade to. */
function upgradeLabel(sub: SubscriptionInfo | null): string | null {
	if (!sub) return null;
	if (sub.isExpired) return 'Renew plan';
	if (!sub.isPaid) return 'Upgrade';
	if (sub.tier === 'starter') return 'Upgrade';
	return null;
}

export function Navbar() {
	const { user, loading, signOut } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	const [mobileOpen, setMobileOpen] = useState(false);
	const [authOpen, setAuthOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

	const menuRef = useRef<HTMLDivElement>(null);
	/** Set when the user signs in from this navbar, so we can take them home. */
	const signingInRef = useRef(false);

	// Escape closes menus.
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setMobileOpen(false);
				setMenuOpen(false);
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	// Click outside closes the account menu.
	useEffect(() => {
		if (!menuOpen) return;
		const onClick = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', onClick);
		return () => document.removeEventListener('mousedown', onClick);
	}, [menuOpen]);

	// Plan and usage for the signed-in nav.
	useEffect(() => {
		if (!user) {
			queueMicrotask(() => setSubscription(null));
			return;
		}
		let alive = true;
		(async () => {
			try {
				const res = await fetch('/api/subscription');
				if (!res.ok) return;
				const data = (await res.json()) as SubscriptionInfo;
				queueMicrotask(() => {
					if (alive) setSubscription(data);
				});
			} catch (error) {
				log.warn('could not load subscription', { code: errorCode(error) });
			}
		})();
		return () => {
			alive = false;
		};
	}, [user]);

	// Signed in from the navbar on the marketing home: go to the dashboard.
	useEffect(() => {
		if (user && signingInRef.current) {
			signingInRef.current = false;
			if (pathname === '/') router.replace('/dashboard');
		}
	}, [user, pathname, router]);

	const closeAll = () => {
		setMobileOpen(false);
		setMenuOpen(false);
	};

	const openLogin = () => {
		closeAll();
		signingInRef.current = true;
		setAuthOpen(true);
	};

	const tryDemo = () => {
		closeAll();
		if (loading) return;
		if (!user) {
			openLogin();
			return;
		}
		router.push('/scan');
	};

	const logout = async () => {
		closeAll();
		await signOut();
		setSubscription(null);
		router.push('/');
	};

	const isActive = (href: string) =>
		pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

	const plansHref = pathname === '/' ? '/#pricing' : '/pricing';
	const upgrade = upgradeLabel(subscription);
	const planName = subscription
		? subscription.isExpired
			? 'Plan ended'
			: getTierLabel(subscription.tier, subscription.websites_limit)
		: null;

	// While auth is loading, render the bar without either nav to avoid a flash.
	const signedIn = !!user;

	return (
		<>
			<header className='sticky top-0 z-20 border-b border-choco-100 bg-cream-50/80 backdrop-blur-sm'>
				<div className='mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8'>
					<div className='flex items-center gap-6'>
						<Logo href={signedIn ? '/dashboard' : '/'} />

						{/* App tabs (signed in, desktop) */}
						{signedIn && (
							<nav className='hidden items-center gap-1 md:flex' aria-label='App'>
								{APP_TABS.map((t) => (
									<Link
										key={t.href}
										href={t.href}
										aria-current={isActive(t.href) ? 'page' : undefined}
										className={`rounded-lg px-3 py-1.5 text-sm transition ${
											isActive(t.href)
												? 'bg-white font-semibold text-choco-900 shadow-sm ring-1 ring-choco-100'
												: 'text-choco-600 hover:bg-white/60 hover:text-choco-900'
										}`}>
										{t.label}
									</Link>
								))}
							</nav>
						)}
					</div>

					{/* ── Desktop right side ─────────────────────────────────────── */}
					{signedIn ? (
						<div className='hidden items-center gap-3 md:flex'>
							{subscription && (
								<Link
									href='/dashboard'
									title='Websites used on your plan'
									className='hidden items-center gap-2 rounded-full border border-choco-100 bg-white/70 px-3 py-1 text-xs text-choco-600 lg:inline-flex'>
									<span
										className={`h-1.5 w-1.5 rounded-full ${usageColor(subscription.websites_used, subscription.websites_limit)}`}
									/>
									{subscription.websites_used}/{subscription.websites_limit} sites
								</Link>
							)}

							{upgrade && (
								<Link
									href='/pricing'
									className='rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100'>
									{upgrade}
								</Link>
							)}

							<Link
								href='/scan'
								className='inline-flex items-center gap-1.5 rounded-full bg-choco-900 px-4 py-1.5 text-xs font-semibold text-cream-50 transition hover:bg-choco-800'>
								<span aria-hidden>＋</span> New scan
							</Link>

							{/* Account menu */}
							<div className='relative' ref={menuRef}>
								<button
									type='button'
									onClick={() => setMenuOpen((v) => !v)}
									aria-haspopup='menu'
									aria-expanded={menuOpen}
									aria-label='Account menu'
									className='flex h-8 w-8 items-center justify-center rounded-full bg-choco-800 text-xs font-semibold text-white transition hover:bg-choco-900 focus:outline-none focus:ring-2 focus:ring-choco-400'>
									{user.email?.charAt(0).toUpperCase()}
								</button>

								{menuOpen && (
									<div
										role='menu'
										className='absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-choco-100 bg-white shadow-xl'>
										<div className='border-b border-choco-100 bg-cream-50/60 px-4 py-4'>
											<div className='flex items-center gap-2'>
												<p className='min-w-0 flex-1 truncate text-xs text-choco-600'>
													{user.email}
												</p>
												{planName && subscription && (
													<span
														className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${getTierBadgeColor(subscription.isExpired ? 'expired' : subscription.tier)}`}>
														{planName}
													</span>
												)}
											</div>
											{subscription && (
												<div className='mt-3'>
													<div className='mb-1.5 flex justify-between text-[11px] text-choco-500'>
														<span>Websites</span>
														<span className='font-medium text-choco-700'>
															{subscription.websites_used} / {subscription.websites_limit}
														</span>
													</div>
													<div className='h-1.5 w-full rounded-full bg-choco-100'>
														<div
															className={`h-1.5 rounded-full ${usageColor(subscription.websites_used, subscription.websites_limit)}`}
															style={{
																width: `${Math.min(100, (subscription.websites_used / Math.max(1, subscription.websites_limit)) * 100)}%`,
															}}
														/>
													</div>
												</div>
											)}
										</div>

										<div className='py-2'>
											<MenuLink href='/pricing' icon='💳' label='Plans & pricing' onClick={closeAll} />
											<MenuLink
												href={CALENDLY_URL}
												external
												icon='🧑‍🏫'
												label='Book an expert review'
												onClick={closeAll}
											/>
										</div>
										<div className='border-t border-choco-100 py-2'>
											<button
												type='button'
												role='menuitem'
												onClick={logout}
												className='mx-1 flex w-[calc(100%-8px)] items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm text-red-500 transition hover:bg-red-50'>
												<span className='w-5 text-center'>🚪</span>
												Log out
											</button>
										</div>
									</div>
								)}
							</div>
						</div>
					) : (
						<nav className='hidden items-center gap-4 text-sm text-choco-700 md:flex'>
							<Link href='/#how-it-works' className='transition hover:text-choco-900'>
								How it works
							</Link>
							<Link href='/#who-its-for' className='transition hover:text-choco-900'>
								Who it&apos;s for
							</Link>
							<button
								type='button'
								onClick={tryDemo}
								className='cursor-pointer transition hover:text-choco-900'>
								Try demo
							</button>
							<Button
								className='px-4 py-1.5 text-xs'
								type='button'
								onClick={() => router.push(plansHref)}>
								See plans
							</Button>
							<a
								href={CALENDLY_URL}
								target='_blank'
								rel='noopener noreferrer'
								className='inline-flex items-center gap-1.5 text-xs text-choco-600 transition hover:text-choco-900'>
								📅 Book a call
							</a>
							{!loading && (
								<button
									type='button'
									onClick={openLogin}
									className='text-xs text-choco-700 transition hover:text-choco-900'>
									Login
								</button>
							)}
						</nav>
					)}

					{/* Mobile toggle */}
					<button
						type='button'
						className='inline-flex items-center justify-center rounded-xl border border-choco-200 bg-white/70 px-3 py-2 text-sm text-choco-900 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-choco-400 md:hidden'
						aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
						aria-expanded={mobileOpen}
						onClick={() => setMobileOpen((v) => !v)}>
						<span className='text-lg leading-none'>{mobileOpen ? '✕' : '☰'}</span>
					</button>
				</div>

				{/* ── Mobile panel ─────────────────────────────────────────────── */}
				{mobileOpen && (
					<div className='border-t border-choco-100 bg-cream-50/95 backdrop-blur-sm md:hidden'>
						<nav className='mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm text-choco-800 sm:px-6'>
							{signedIn ? (
								<>
									{subscription && (
										<div className='mb-2 flex items-center justify-between rounded-xl border border-choco-100 bg-white/60 px-3 py-2.5'>
											<span className='truncate text-xs text-choco-500'>{user.email}</span>
											<span className='shrink-0 text-xs text-choco-600'>
												{planName} · {subscription.websites_used}/{subscription.websites_limit} sites
											</span>
										</div>
									)}
									<Link
										href='/scan'
										onClick={closeAll}
										className='mb-1 flex items-center justify-center gap-1.5 rounded-full bg-choco-900 py-2.5 text-sm font-semibold text-cream-50'>
										＋ New scan
									</Link>
									{APP_TABS.map((t) => (
										<Link
											key={t.href}
											href={t.href}
											onClick={closeAll}
											className={`rounded-xl px-3 py-2.5 transition hover:bg-white/70 ${isActive(t.href) ? 'bg-white/70 font-semibold text-choco-900' : ''}`}>
											{t.label}
										</Link>
									))}
									<Link
										href='/pricing'
										onClick={closeAll}
										className='rounded-xl px-3 py-2.5 transition hover:bg-white/70'>
										{upgrade ?? 'Plans & pricing'}
									</Link>
									<a
										href={CALENDLY_URL}
										target='_blank'
										rel='noopener noreferrer'
										onClick={closeAll}
										className='rounded-xl px-3 py-2.5 transition hover:bg-white/70'>
										Book an expert review
									</a>
									<button
										type='button'
										onClick={logout}
										className='mt-2 w-full rounded-full bg-white px-4 py-2 text-sm font-medium text-red-500 ring-1 ring-red-100 transition hover:bg-red-50'>
										Log out
									</button>
								</>
							) : (
								<>
									<Link href='/#how-it-works' onClick={closeAll} className='rounded-xl px-3 py-2 transition hover:bg-white/70'>
										How it works
									</Link>
									<Link href='/#who-its-for' onClick={closeAll} className='rounded-xl px-3 py-2 transition hover:bg-white/70'>
										Who it&apos;s for
									</Link>
									<button
										type='button'
										onClick={tryDemo}
										className='rounded-xl px-3 py-2 text-left transition hover:bg-white/70'>
										Try demo
									</button>
									<Button
										type='button'
										className='mt-2 w-full justify-center'
										onClick={() => {
											closeAll();
											router.push(plansHref);
										}}>
										See plans
									</Button>
									<a
										href={CALENDLY_URL}
										target='_blank'
										rel='noopener noreferrer'
										className='mt-1 flex w-full items-center justify-center gap-2 rounded-full border border-choco-200 py-2.5 text-sm text-choco-700 transition hover:border-choco-400 hover:text-choco-900'>
										📅 Book a 30-min call
									</a>
									<Button type='button' className='mt-2 w-full justify-center' onClick={openLogin}>
										Login / Sign up
									</Button>
								</>
							)}
						</nav>
					</div>
				)}
			</header>

			<AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode='login' />
		</>
	);
}

function MenuLink({
	href,
	icon,
	label,
	onClick,
	external,
}: {
	href: string;
	icon: string;
	label: string;
	onClick: () => void;
	external?: boolean;
}) {
	const className =
		'mx-1 flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-choco-700 transition hover:bg-choco-50 hover:text-choco-900';
	if (external) {
		return (
			<a href={href} target='_blank' rel='noopener noreferrer' role='menuitem' onClick={onClick} className={className}>
				<span className='w-5 text-center'>{icon}</span>
				{label}
			</a>
		);
	}
	return (
		<Link href={href} role='menuitem' onClick={onClick} className={className}>
			<span className='w-5 text-center'>{icon}</span>
			{label}
		</Link>
	);
}
