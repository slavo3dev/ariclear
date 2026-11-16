// POST /api/auth/reset
// Sends a password reset email. Always answers the same way, so it can't be
// used to find out which addresses have accounts.

import { NextResponse } from 'next/server';
import { supabaseAriClearServer } from '@/lib/supabase/auth/server';
import { clientIp, rateLimitAll } from '@/lib/security/rateLimit';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth/reset');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
	const body = await req.json().catch(() => null);
	const email = typeof body?.email === 'string' ? body.email.trim() : '';

	if (!EMAIL_RE.test(email) || email.length > 320) {
		return NextResponse.json(
			{ message: 'Please enter a valid email address.' },
			{ status: 400 },
		);
	}

	const limit = await rateLimitAll([
		[`reset:ip:${clientIp(req)}`, 5, 60 * 60_000],
		[`reset:email:${email.toLowerCase()}`, 3, 60 * 60_000],
	]);
	if (!limit.ok) {
		return NextResponse.json(
			{ message: 'Too many reset requests. Try again later.' },
			{ status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
		);
	}

	const supabase = await supabaseAriClearServer();
	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/confirm?next=/reset-password`,
	});
	if (error) {
		log.warn('reset email not sent', { code: error.code ?? 'unknown' });
	}

	return NextResponse.json({
		success: true,
		message: 'If that email has an account, a reset link is on its way.',
	});
}
