// POST /api/auth/login
// Signs in with email + password. The session lives ONLY in the httpOnly
// cookies that @supabase/ssr sets on this response; no tokens are returned in
// the body, so page scripts never see them.

import { NextResponse } from 'next/server';
import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { clientIp, rateLimitAll } from '@/lib/security/rateLimit';

export async function POST(req: Request) {
	const body = await req.json().catch(() => null);
	const email = typeof body?.email === 'string' ? body.email.trim() : '';
	const password = typeof body?.password === 'string' ? body.password : '';

	if (!email || !password || email.length > 320 || password.length > 200) {
		return NextResponse.json(
			{ message: 'Enter your email and password.' },
			{ status: 400 },
		);
	}

	// Slow down password guessing: per IP, and per email address.
	const limit = await rateLimitAll([
		[`login:ip:${clientIp(req)}`, 20, 10 * 60_000],
		[`login:email:${email.toLowerCase()}`, 10, 10 * 60_000],
	]);
	if (!limit.ok) {
		return NextResponse.json(
			{ message: 'Too many attempts. Wait a few minutes and try again.' },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
		);
	}

	const supabase = await supabaseAriClearServer();
	const { error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		const unconfirmed = error.code === 'email_not_confirmed';
		return NextResponse.json(
			{
				message: unconfirmed
					? 'Please confirm your email first. Check your inbox for the link.'
					: 'Wrong email or password. Please try again.',
			},
			{ status: unconfirmed ? 403 : 400 },
		);
	}

	return NextResponse.json({ success: true });
}
