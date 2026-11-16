// POST /api/auth/signup
// Creates an account and sends the verification email.
//
// Duplicate emails: Supabase does not reveal whether an address is
// registered; for an existing confirmed address it returns a user with no
// identities, which we report as "already exists". (The old pre-check that
// queried auth.users through PostgREST never worked: that schema is not
// exposed, so it always returned nothing.)

import { NextResponse } from 'next/server';
import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { clientIp, rateLimit } from '@/lib/security/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
	const limit = await rateLimit(`signup:${clientIp(req)}`, 5, 60 * 60_000);
	if (!limit.ok) {
		return NextResponse.json(
			{ message: 'Too many sign-ups from this network. Try again later.' },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
		);
	}

	const body = await req.json().catch(() => null);
	const email = typeof body?.email === 'string' ? body.email.trim() : '';
	const password = typeof body?.password === 'string' ? body.password : '';

	if (!EMAIL_RE.test(email) || email.length > 320) {
		return NextResponse.json(
			{ message: 'Please enter a valid email address.' },
			{ status: 400 },
		);
	}
	if (password.length < 6 || password.length > 200) {
		return NextResponse.json(
			{ message: 'Your password must be at least 6 characters.' },
			{ status: 400 },
		);
	}

	const supabase = await supabaseAriClearServer();

	const { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/verify-email`,
		},
	});

	if (error) {
		const weak = error.code === 'weak_password';
		return NextResponse.json(
			{
				message: weak
					? 'That password is too weak. Try a longer one.'
					: 'Could not create your account. Please try again.',
			},
			{ status: 400 },
		);
	}

	if (data.user && data.user.identities?.length === 0) {
		return NextResponse.json(
			{
				message:
					'An account with this email already exists. Try logging in instead.',
			},
			{ status: 409 },
		);
	}

	return NextResponse.json({ success: true });
}
