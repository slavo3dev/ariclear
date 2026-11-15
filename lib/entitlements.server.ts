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

/** Atomically reserve the site slot and count the scan (claim_scan() in SQL). */
export async function claimScan(
	userId: string,
	domain: string,
	url: string,
	limits: { p_max_sites: number; p_max_lifetime_scans: number | null },
): Promise<ClaimResult> {
	const { data, error } = await supabaseAriClearAdmin().rpc('claim_scan', {
		p_user_id: userId,
		p_domain: domain,
		p_url: url,
		...limits,
	});
	if (error) throw new EntitlementsUnavailableError();
	return data as ClaimResult;
}
