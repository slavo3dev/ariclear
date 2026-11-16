// GET  /api/email/unsubscribe?u=<user>&t=<sig>  -> confirmation page
// POST /api/email/unsubscribe?u=<user>&t=<sig>  -> RFC 8058 one-click
// Turns off the re-scan digest for that account. The signed token (see
// lib/email/unsubscribe) proves the link came from one of our emails.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAriClearAdmin } from '@/lib/supabase/admin';
import { verifyUnsubscribe } from '@/lib/email/unsubscribe';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('email/unsubscribe');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function unsubscribe(req: NextRequest): Promise<boolean | null> {
	const u = req.nextUrl.searchParams.get('u') ?? '';
	const t = req.nextUrl.searchParams.get('t') ?? '';
	if (!UUID_RE.test(u) || !verifyUnsubscribe(u, t)) return null;
	const { error } = await supabaseAriClearAdmin()
		.from('user_subscriptions')
		.update({ email_digest: false })
		.eq('user_id', u);
	if (error) {
		log.error('update failed', { code: error.code ?? 'unknown' });
		return false;
	}
	return true;
}

function page(title: string, body: string, status: number) {
	return new NextResponse(
		`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#fefcf8;color:#2b1510;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:16px">
<main style="max-width:420px;text-align:center"><h1 style="font-size:20px">${title}</h1><p>${body}</p><p><a href="/" style="color:#964b2e">Back to AriClear</a></p></main></body></html>`,
		{ status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
	);
}

export async function GET(req: NextRequest) {
	const ok = await unsubscribe(req);
	if (ok === null) return page('Link not valid', 'This unsubscribe link is invalid or incomplete.', 400);
	if (!ok) return page('Something went wrong', 'Please try the link again in a moment.', 500);
	return page('You are unsubscribed', 'You will no longer get weekly score emails from AriClear.', 200);
}

export async function POST(req: NextRequest) {
	const ok = await unsubscribe(req);
	if (ok === null) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
	if (!ok) return NextResponse.json({ error: 'Try again' }, { status: 500 });
	return NextResponse.json({ unsubscribed: true });
}
