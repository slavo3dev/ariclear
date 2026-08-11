// lib/security/rateLimit.ts
// Best-effort in-memory sliding window limiter, keyed by string.
// IMPORTANT: state is per server instance. On serverless hosting (Vercel) this
// only slows abuse down; the real protections are authentication and a
// shared store (Upstash/Redis/Supabase) when traffic grows.

const buckets = new Map<string, number[]>();

export function rateLimit(
	key: string,
	max: number,
	windowMs: number,
): { ok: boolean; retryAfterSec: number } {
	const now = Date.now();
	const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

	if (hits.length >= max) {
		buckets.set(key, hits);
		return {
			ok: false,
			retryAfterSec: Math.ceil((windowMs - (now - hits[0])) / 1000),
		};
	}

	hits.push(now);
	buckets.set(key, hits);

	// opportunistic cleanup so the map cannot grow without bound
	if (buckets.size > 5000) {
		for (const [k, v] of buckets) {
			if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
		}
	}
	return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
	const h = req.headers;
	return (
		h.get('x-real-ip') ??
		h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		'unknown'
	);
}
