// lib/logger.ts
// Small structured logger. Use it instead of console.*.
//
// Rules it enforces:
//   * Only primitive metadata (string / number / boolean / null). Objects and
//     Error instances are dropped, so raw DB errors and model output can't leak.
//   * Keys that look like personal data or secrets (email, token, password,
//     key, secret, user id, ip, cookie, authorization) are redacted.
//   * Strings are cut to 200 characters.
//   * Silent under NODE_ENV=test. Level from LOG_LEVEL (debug|info|warn|error|
//     silent); default info in production, debug elsewhere.
//
// Error reporting (Sentry etc.): call setLogSink() once at startup with a
// function that forwards entries. Nothing is wired up yet.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogMeta = Record<string, string | number | boolean | null | undefined>;
export type LogEntry = {
	level: LogLevel;
	scope: string;
	message: string;
	meta: Record<string, string | number | boolean | null>;
	time: string;
};
export type LogSink = (entry: LogEntry) => void;

const ORDER: Record<LogLevel | 'silent', number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
	silent: 100,
};

const SENSITIVE_KEY =
	/(^|_|-)(email|e_?mail|token|password|passwd|secret|key|apikey|user_?id|uid|ip|cookie|authorization|auth)($|_|-)/i;

const MAX_STRING = 200;

let extraSink: LogSink | null = null;

/** Forward every emitted entry to an extra sink (e.g. Sentry). */
export function setLogSink(sink: LogSink | null): void {
	extraSink = sink;
}

function threshold(): number {
	if (process.env.NODE_ENV === 'test') return ORDER.silent;
	const env = (process.env.LOG_LEVEL ?? '').toLowerCase();
	if (env in ORDER) return ORDER[env as keyof typeof ORDER];
	return process.env.NODE_ENV === 'production' ? ORDER.info : ORDER.debug;
}

function clean(meta: LogMeta | undefined): LogEntry['meta'] {
	const out: LogEntry['meta'] = {};
	if (!meta) return out;
	for (const [k, v] of Object.entries(meta)) {
		if (v === undefined) continue;
		if (SENSITIVE_KEY.test(k)) {
			out[k] = '[redacted]';
			continue;
		}
		if (typeof v === 'string') {
			out[k] = v.length > MAX_STRING ? `${v.slice(0, MAX_STRING)}…` : v;
		} else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
			out[k] = v;
		}
	}
	return out;
}

function format(e: LogEntry): string {
	const pairs = Object.entries(e.meta)
		.map(([k, v]) => `${k}=${v}`)
		.join(' ');
	return `[${e.scope}] ${e.message}${pairs ? ` ${pairs}` : ''}`;
}

function emit(level: LogLevel, scope: string, message: string, meta?: LogMeta) {
	if (ORDER[level] < threshold()) return;
	const entry: LogEntry = {
		level,
		scope,
		message,
		meta: clean(meta),
		time: new Date().toISOString(),
	};
	const line = format(entry);
	if (level === 'error') console.error(line);
	else if (level === 'warn') console.warn(line);
	else console.info(line);
	if (extraSink) {
		try {
			extraSink(entry);
		} catch {
			// A broken sink must never break the request.
		}
	}
}

export type Logger = {
	debug: (message: string, meta?: LogMeta) => void;
	info: (message: string, meta?: LogMeta) => void;
	warn: (message: string, meta?: LogMeta) => void;
	error: (message: string, meta?: LogMeta) => void;
};

/** A logger bound to a scope, e.g. createLogger('analyze'). */
export function createLogger(scope: string): Logger {
	return {
		debug: (m, meta) => emit('debug', scope, m, meta),
		info: (m, meta) => emit('info', scope, m, meta),
		warn: (m, meta) => emit('warn', scope, m, meta),
		error: (m, meta) => emit('error', scope, m, meta),
	};
}

/**
 * A safe, short description of an unknown error: a code, HTTP status or class
 * name. Never the message (DB and provider messages can contain user data).
 */
export function errorCode(err: unknown): string {
	if (err && typeof err === 'object') {
		const e = err as { code?: unknown; status?: unknown; name?: unknown };
		if (typeof e.code === 'string' && e.code) return e.code;
		if (typeof e.status === 'number') return `status_${e.status}`;
		if (typeof e.name === 'string' && e.name) return e.name;
	}
	return 'unknown';
}
