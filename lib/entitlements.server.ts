// lib/entitlements.server.ts
// SERVER ONLY. Loads a user's entitlements with the service-role client, so
// the result cannot be influenced by anything the browser sends.

import { supabaseAriClearAdmin } from '@/lib/supabase/admin';
import {
	resolveEntitlements,
	type Entitlements,
	type SubscriptionRow,
} from '@/lib/entitlements';

const SUB_COLUMNS =
	'tier, websites_limit, plan_expires_at, is_comp, scans_used_total';

export class EntitlementsUnavailableError extends Error {
	constructor() {
		super('Could not load plan details');
		this.name = 'EntitlementsUnavailableError';
	}
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
	const admin = supabaseAriClearAdmin();

	let { data: row, error } = await admin
		.from('user_subscriptions')
		.select(SUB_COLUMNS)
		.eq('user_id', userId)
		.maybeSingle<SubscriptionRow>();
	if (error) throw new EntitlementsUnavailableError();

	if (!row) {
		// The signup trigger normally creates this row. Create it if an older
		// account is missing one.
		const insert = await admin
			.from('user_subscriptions')
			.upsert(
				{ user_id: userId, tier: 'free', websites_limit: 1 },
				{ onConflict: 'user_id', ignoreDuplicates: true },
			);
		if (insert.error) throw new EntitlementsUnavailableError();

		({ data: row, error } = await admin
			.from('user_subscriptions')
			.select(SUB_COLUMNS)
			.eq('user_id', userId)
			.maybeSingle<SubscriptionRow>());
		if (error || !row) throw new EntitlementsUnavailableError();
	}

	const { data: sites, error: sitesError } = await admin
		.from('user_websites')
		.select('domain')
		.eq('user_id', userId);
	if (sitesError) throw new EntitlementsUnavailableError();

	const domains = (sites ?? []).map((s: { domain: string }) => s.domain);
	return resolveEntitlements(row, domains);
}

export type ClaimResult = 'ok' | 'scan_limit' | 'site_limit' | 'no_subscription';

export type RecordResult =
	| { status: 'ok'; scanId: string }
	| { status: Exclude<ClaimResult, 'ok'>; scanId: null };

/**
 * Claim the scan and save the report in one transaction (record_scan() in
 * SQL). `scan` is built on the server from the model output; nothing the
 * browser sends is stored.
 */
export async function recordScan(
	userId: string,
	domain: string,
	url: string,
	limits: { p_max_sites: number; p_max_lifetime_scans: number | null },
	scan: Record<string, unknown>,
): Promise<RecordResult> {
	const { data, error } = await supabaseAriClearAdmin().rpc('record_scan', {
		p_user_id: userId,
		p_domain: domain,
		p_url: url,
		...limits,
		p_scan: scan,
	});
	if (error) throw new EntitlementsUnavailableError();
	const row = (Array.isArray(data) ? data[0] : data) as
		| { status: ClaimResult; scan_id: string | null }
		| undefined;
	if (!row) throw new EntitlementsUnavailableError();
	if (row.status === 'ok' && row.scan_id) {
		return { status: 'ok', scanId: row.scan_id };
	}
	if (row.status === 'ok') throw new EntitlementsUnavailableError();
	return { status: row.status, scanId: null };
}
