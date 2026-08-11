// lib/security/safeFetch.ts
// SSRF-safe fetch for user-supplied URLs.
//  - http/https only, ports 80/443 only, no credentials in the URL
//  - hostname is resolved and every address must be public (blocks localhost,
//    private ranges, link-local/cloud metadata 169.254.x.x, ULA, etc.)
//  - redirects are followed manually and re-validated on every hop
//  - hard timeout and response-size cap
// Note: DNS is resolved before fetch() resolves it again, so a DNS-rebinding
// attacker with a very short TTL could still race this check. Run on infra
// without access to internal networks for full protection.

import { lookup } from 'dns/promises';
import net from 'net';

export class UnsafeUrlError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'UnsafeUrlError';
	}
}

function isPrivateIPv4(ip: string): boolean {
	const [a, b] = ip.split('.').map(Number);
	return (
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 100 && b >= 64 && b <= 127) || // CGNAT
		(a === 169 && b === 254) || // link-local / cloud metadata
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 192 && b === 0) ||
		(a === 198 && (b === 18 || b === 19)) ||
		a >= 224 // multicast / reserved
	);
}

function isPrivateIp(ip: string): boolean {
	if (net.isIPv4(ip)) return isPrivateIPv4(ip);
	if (net.isIPv6(ip)) {
		const v = ip.toLowerCase();
		if (v === '::' || v === '::1') return true;
		// IPv4-mapped (::ffff:a.b.c.d) — the URL parser normalizes the dotted
		// form to two hex groups (::ffff:7f00:1), so handle both.
		const dotted = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
		if (dotted) return isPrivateIPv4(dotted[1]);
		const hex = v.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
		if (hex) {
			const hi = parseInt(hex[1], 16);
			const lo = parseInt(hex[2], 16);
			return isPrivateIPv4(
				`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`,
			);
		}
		// NAT64 / IPv4-compatible forms can also smuggle IPv4: refuse them
		if (v.startsWith('64:ff9b:') || /^::[0-9a-f:.]+$/.test(v)) return true;
		return (
			v.startsWith('fc') ||
			v.startsWith('fd') ||
			v.startsWith('fe8') ||
			v.startsWith('fe9') ||
			v.startsWith('fea') ||
			v.startsWith('feb') ||
			v.startsWith('ff')
		);
	}
	return true; // not a valid IP -> refuse
}

/** Validates a URL and returns the parsed URL, or throws UnsafeUrlError. */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new UnsafeUrlError('Invalid URL');
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new UnsafeUrlError('Only http(s) URLs are allowed');
	}
	if (url.username || url.password) {
		throw new UnsafeUrlError('URLs with credentials are not allowed');
	}
	if (url.port && url.port !== '80' && url.port !== '443') {
		throw new UnsafeUrlError('Only standard web ports are allowed');
	}

	const host = url.hostname.replace(/^\[|\]$/g, '');
	if (host === 'localhost' || host.endsWith('.localhost')) {
		throw new UnsafeUrlError('That address is not allowed');
	}

	const addresses = net.isIP(host)
		? [{ address: host }]
		: await lookup(host, { all: true }).catch(() => {
				throw new UnsafeUrlError('Could not resolve that hostname');
			});

	if (!addresses.length || addresses.some((a) => isPrivateIp(a.address))) {
		throw new UnsafeUrlError('That address is not allowed');
	}
	return url;
}

export type SafeFetchOptions = {
	timeoutMs?: number;
	maxBytes?: number;
	maxRedirects?: number;
	headers?: Record<string, string>;
	/** false = only status/headers, body is discarded (e.g. uptime checks) */
	readBody?: boolean;
};

export type SafeFetchResult = {
	status: number;
	ok: boolean;
	finalUrl: string;
	body: string;
};

export async function safeFetch(
	rawUrl: string,
	opts: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
	const {
		timeoutMs = 10_000,
		maxBytes = 2_000_000,
		maxRedirects = 3,
		headers = {},
		readBody = true,
	} = opts;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		let current = rawUrl;
		for (let hop = 0; hop <= maxRedirects; hop++) {
			const url = await assertPublicHttpUrl(current);
			const res = await fetch(url, {
				method: 'GET',
				headers,
				redirect: 'manual',
				signal: controller.signal,
			});

			if (res.status >= 300 && res.status < 400) {
				const location = res.headers.get('location');
				await res.body?.cancel().catch(() => {});
				if (!location) {
					return {
						status: res.status,
						ok: false,
						finalUrl: url.toString(),
						body: '',
					};
				}
				current = new URL(location, url).toString();
				continue;
			}

			let body = '';
			if (readBody && res.body) {
				const reader = res.body.getReader();
				const chunks: Uint8Array[] = [];
				let total = 0;
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					total += value.byteLength;
					if (total > maxBytes) {
						await reader.cancel().catch(() => {});
						break; // truncate: enough content for analysis
					}
					chunks.push(value);
				}
				body = Buffer.concat(chunks).toString('utf8');
			} else {
				await res.body?.cancel().catch(() => {});
			}

			return {
				status: res.status,
				ok: res.ok,
				finalUrl: url.toString(),
				body,
			};
		}
		throw new UnsafeUrlError('Too many redirects');
	} finally {
		clearTimeout(timer);
	}
}
