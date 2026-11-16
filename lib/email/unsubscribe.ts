// lib/email/unsubscribe.ts
// Signed one-click unsubscribe links: /api/email/unsubscribe?u=<user>&t=<sig>.
// The signature is an HMAC of the user id, so a link can only switch off the
// account it was sent to, and needs no sign-in.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { SITE_URL } from '@/lib/site';

function secret(): string | null {
	return process.env.EMAIL_SIGNING_SECRET || process.env.CRON_SECRET || null;
}

function sign(userId: string, key: string): string {
	return createHmac('sha256', key).update(`unsubscribe:${userId}`).digest('base64url');
}

/** Null when no signing secret is configured (then no digest is sent). */
export function unsubscribeUrl(userId: string): string | null {
	const key = secret();
	if (!key) return null;
	const qs = new URLSearchParams({ u: userId, t: sign(userId, key) });
	return `${SITE_URL}/api/email/unsubscribe?${qs.toString()}`;
}

export function verifyUnsubscribe(userId: string, token: string): boolean {
	const key = secret();
	if (!key || !userId || !token) return false;
	const expected = Buffer.from(sign(userId, key));
	const given = Buffer.from(token);
	return expected.length === given.length && timingSafeEqual(expected, given);
}
