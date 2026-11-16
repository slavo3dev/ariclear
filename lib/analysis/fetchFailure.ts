// lib/analysis/fetchFailure.ts
// Turns the HTTP status of a failed page fetch into a message the user can act
// on. Shared by the full scan (lib/analysis/runScan) and the homepage demo.
//
// A 401/403/429 almost always means bot protection (Cloudflare, Akamai, a WAF)
// refused our crawler. We say so plainly instead of pretending the site is
// down: if AriClear is blocked, AI crawlers are often blocked too, which is
// worth knowing.

export type FetchFailureKind = 'blocked' | 'not_found' | 'server_error' | 'other';

export type FetchFailure = {
	kind: FetchFailureKind;
	/** Short, for tight spaces such as the homepage demo. */
	short: string;
	/** Full message with what to do next. */
	message: string;
};

export function describeFetchFailure(status: number): FetchFailure {
	if (status === 401 || status === 403 || status === 429) {
		return {
			kind: 'blocked',
			short: 'Your site blocked our scanner. AI crawlers may be blocked too.',
			message:
				`Your site blocked our scanner (HTTP ${status}). This usually means bot protection ` +
				'such as Cloudflare or a firewall rule. AI crawlers like GPTBot and ClaudeBot are often ' +
				'blocked the same way, which keeps your site out of AI answers. Allow "AriClearBot" ' +
				"in your firewall's bot settings, then scan again.",
		};
	}
	if (status === 404 || status === 410) {
		return {
			kind: 'not_found',
			short: "That page wasn't found. Try your homepage.",
			message: `That page wasn't found (HTTP ${status}). Check the address, or scan your homepage.`,
		};
	}
	if (status >= 500) {
		return {
			kind: 'server_error',
			short: 'Your site returned a server error. Try again soon.',
			message: `Your site returned a server error (HTTP ${status}). Try again in a few minutes.`,
		};
	}
	return {
		kind: 'other',
		short: "Couldn't load that page. Try your homepage.",
		message: `Couldn't load that page (HTTP ${status}). Try your homepage.`,
	};
}
