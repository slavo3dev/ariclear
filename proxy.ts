// proxy.ts (Next 16's name for middleware)
//
// 1. Refreshes the Supabase session cookies on guarded routes, so server code
//    always sees a current session.
// 2. Guards signed-in areas before any page or route code runs:
//      pages -> redirect to /?signin=1&next=<path> (the home page opens the
//               sign-in modal and returns the user afterwards)
//      APIs  -> 401 JSON
// 3. The dashboard is the signed-in home: a signed-in visitor of "/" goes
//    to /dashboard (or to the page in ?next= after signing in). Signed-out
//    visitors get the marketing home page as before, without an auth call.
// Every route still checks the user itself; this is the first line, not the
// only one. /scan (the scan form) is not guarded: it shows its own sign-up
// prompt so new visitors can start there.

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/** Only same-site relative paths (blocks //evil.com and absolute URLs). */
function safeNext(raw: string | null): string | null {
	if (!raw) return null;
	return raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : null;
}

export async function proxy(request: NextRequest) {
	const { pathname, search } = request.nextUrl;
	const isHome = pathname === '/';

	// Home page: no Supabase session cookie means signed out. Skip the auth
	// call so the public home page stays fast.
	if (isHome && !request.cookies.getAll().some((c) => c.name.startsWith('sb-'))) {
		return NextResponse.next();
	}

	let response = NextResponse.next({ request });

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) =>
						request.cookies.set(name, value),
					);
					response = NextResponse.next({ request });
					cookiesToSet.forEach(({ name, value, options }) =>
						response.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	// getUser() validates the session with Supabase Auth (not just the cookie).
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (isHome) {
		if (!user) return response;
		const next = safeNext(request.nextUrl.searchParams.get('next')) ?? '/dashboard';
		const redirect = NextResponse.redirect(new URL(next, request.url));
		// Keep any refreshed session cookies.
		response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
		return redirect;
	}

	if (user) return response;

	if (pathname.startsWith('/api/')) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const to = request.nextUrl.clone();
	to.pathname = '/';
	to.search = '';
	to.searchParams.set('signin', '1');
	to.searchParams.set('next', `${pathname}${search}`);
	return NextResponse.redirect(to);
}

export const config = {
	matcher: [
		// Home: signed-in visitors go to the dashboard
		'/',
		// Signed-in pages
		'/dashboard/:path*',
		'/history/:path*',
		'/brand-awareness',
		'/scan/:id+',
		// Account and paid APIs (the Stripe webhook is deliberately absent)
		'/api/analyze',
		'/api/scans/:path*',
		'/api/subscription',
		'/api/billing/checkout',
		'/api/brand-awareness/:path*',
	],
};
