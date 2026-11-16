// lib/email/digest.ts
// The re-scan digest: "your score moved from X to Y, top fix left".

import { SITE_URL } from '@/lib/site';

export type DigestInput = {
	domain: string;
	scanId: string;
	before: { overall: number; human: number; ai: number } | null;
	after: { overall: number; human: number; ai: number };
	/** First issue on the new scan that is not ticked off. */
	topFix: string | null;
	unsubscribeUrl: string;
};

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function moved(from: number, to: number): string {
	const d = to - from;
	return d === 0 ? `stayed at ${to}` : `moved from ${from} to ${to} (${d > 0 ? '+' : ''}${d})`;
}

export function buildDigest(input: DigestInput) {
	const link = `${SITE_URL}/scan/${input.scanId}`;
	const { before, after } = input;

	const headline = before
		? `Your ${input.domain} score ${moved(before.overall, after.overall)}`
		: `Your ${input.domain} score is ${after.overall}`;

	const lines = [
		headline + '.',
		'',
		before
			? `Clarity: ${before.human} → ${after.human} · AI readability: ${before.ai} → ${after.ai}`
			: `Clarity: ${after.human} · AI readability: ${after.ai}`,
		'',
		input.topFix ? `Top fix left: ${input.topFix}` : 'No open issues. Nice work.',
		'',
		`See the full report: ${link}`,
		'',
		'—',
		'AriClear re-scans your site every week while your plan is active.',
		`Stop these emails: ${input.unsubscribeUrl}`,
	];

	const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2b1510;background:#fefcf8;padding:24px">
<p style="font-size:18px;font-weight:700;margin:0 0 12px">${esc(headline)}.</p>
<p style="margin:0 0 12px">${esc(lines[2])}</p>
<p style="margin:0 0 16px">${input.topFix ? `<strong>Top fix left:</strong> ${esc(input.topFix)}` : 'No open issues. Nice work.'}</p>
<p style="margin:0 0 24px"><a href="${esc(link)}" style="background:#2b1510;color:#fefcf8;padding:10px 16px;border-radius:999px;text-decoration:none">See the full report</a></p>
<p style="font-size:12px;color:#964b2e;margin:0">AriClear re-scans your site every week while your plan is active. <a href="${esc(input.unsubscribeUrl)}" style="color:#964b2e">Stop these emails</a>.</p>
</body></html>`;

	return { subject: headline, text: lines.join('\n'), html };
}
