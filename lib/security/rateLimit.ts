// lib/security/rateLimit.ts
// Fixed-window rate limiter with shared storage, so limits hold across all
// serverless instances.
//
// Storage, first match wins:
//   1. Upstash Redis REST API  (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
//   2. Supabase                (rate_limit_hit() in the AriClear project; needs
//                               SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY)
//   3. In-memory               (local dev only; per instance)
// If the shared store errors, the request falls back to the in-memory window
// for that instance instead of failing.
//
// Keys are hashed before they leave the process, so user ids and IP addresses
// are never stored in Redis or Postgres.

import { createHash } from 'node:crypto';
import { supabaseAriClearAdmin } from '@/lib/supabase/admin';
import { createLogger, errorCode } from '@/lib/logger';

const log = createLogger('rate-limit');

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

// ─── In-memory fallback ─────────────────────────────────────────────────────

const memory = new Map<string, { windowStart: number; hits: number }>();

function memoryHit(key: string, max: number, windowMs: number): RateLimitResult {
	const now = Date.now();
	const windowStart = Math.floor(now / windowMs) * windowMs;
	const cur = memory.get(key);
	const hits = cur && cur.windowStart === windowStart ? cur.hits + 1 : 1;
	memory.set(key, { windowStart, hits });

	if (memory.size > 5000) {
		for (const [k, v] of memory) {
			if (now - v.windowStart >= windowMs) memory.delete(k);
		}
	}
	return result(hits, max, windowStart + windowMs - now);
}

// ─── Shared stores ──────────────────────────────────────────────────────────

function result(hits: number, max: number, msLeft: number): RateLimitResult {
	const ok = hits <= max;
	return { ok, retryAfterSec: ok ? 0 : Math.max(1, Math.ceil(msLeft / 1000)) };
}

async function upstashHit(
	key: string,
	max: number,
	windowMs: number,
): Promise<RateLimitResult> {
	const url = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/$/, '');
	const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
	const now = Date.now();
	const windowStart = Math.floor(now / windowMs) * windowMs;
	const redisKey = `${key}:${windowStart}`;

	const res = await fetch(`${url}/pipeline`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify([
			['INCR', redisKey],
			['PEXPIRE', redisKey, String(windowMs + 1000)],
		]),
		cache: 'no-store',
		signal: AbortSignal.timeout(2000),
	});
	if (!res.ok) throw new Error(`upstash_status_${res.status}`);
	const body = (await res.json()) as Array<{ result?: unknown; error?: string }>;
	const hits = Number(body?.[0]?.result);
	if (!Number.isFinite(hits)) throw new Error('upstash_bad_response');
	return result(hits, max, windowStart + windowMs - now);
}

async function supabaseHit(
	key: string,
	max: number,
	windowMs: number,
): Promise<RateLimitResult> {
	const { data, error } = await supabaseAriClearAdmin().rpc('rate_limit_hit', {
		p_key: key,
		p_max: max,
		p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
	});
	if (error) throw error;
	const row = (Array.isArray(data) ? data[0] : data) as
		| { allowed: boolean; retry_after_seconds: number }
		| undefined;
	if (!row || typeof row.allowed !== 'boolean') {
		throw new Error('rate_limit_bad_response');
	}
	return {
		ok: row.allowed,
		retryAfterSec: row.allowed ? 0 : Math.max(1, row.retry_after_seconds),
	};
}

type Backend = 'upstash' | 'supabase' | 'memory';

function backend(): Backend {
	if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
		return 'upstash';
	}
	if (
		process.env.SUPABASE_ARI_CLEAR_SERVICE_ROLE_KEY &&
		process.env.NEXT_PUBLIC_SUPABASE_ARI_CLEAR_URL
	) {
		return 'supabase';
	}
	return 'memory';
}

function hashKey(key: string): string {
	// Keep the readable scope ("analyze", "demo:day") and hash the rest.
	const i = key.lastIndexOf(':');
	const scope = i > 0 ? key.slice(0, i) : 'rl';
	const ident = i > 0 ? key.slice(i + 1) : key;
	const digest = createHash('sha256').update(ident).digest('hex').slice(0, 32);
	return `rl:${scope}:${digest}`;
}

/**
 * Count one hit for `key` and say whether it is within `max` per `windowMs`.
 * Keys look like "scope:identifier", e.g. `analyze:${userId}`.
 */
export async function rateLimit(
	key: string,
	max: number,
	windowMs: number,
): Promise<RateLimitResult> {
	const hashed = hashKey(key);
	const which = backend();
	if (which === 'memory') return memoryHit(hashed, max, windowMs);

	try {
		return which === 'upstash'
			? await upstashHit(hashed, max, windowMs)
			: await supabaseHit(hashed, max, windowMs);
	} catch (err) {
		log.warn('shared store failed, using in-memory window', {
			backend: which,
			code: errorCode(err),
		});
		return memoryHit(hashed, max, windowMs);
	}
}

/** Check several windows at once (e.g. per minute AND per day). */
export async function rateLimitAll(
	rules: Array<[key: string, max: number, windowMs: number]>,
): Promise<RateLimitResult> {
	const results = await Promise.all(rules.map(([k, m, w]) => rateLimit(k, m, w)));
	const blocked = results.filter((r) => !r.ok);
	if (blocked.length === 0) return { ok: true, retryAfterSec: 0 };
	return {
		ok: false,
		retryAfterSec: Math.max(...blocked.map((r) => r.retryAfterSec)),
	};
}

export function clientIp(req: Request): string {
	const h = req.headers;
	return (
		h.get('x-real-ip') ??
		h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		'unknown'
	);
}
