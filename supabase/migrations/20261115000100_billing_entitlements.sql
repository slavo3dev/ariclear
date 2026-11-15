-- 20261115000100_billing_entitlements.sql
--
-- Phase 1: billing + entitlements.
-- NOT APPLIED. Run it in the AriClear project's SQL Editor, then deploy the
-- Phase 1 code. Run the migration FIRST: the new code calls claim_scan() and
-- apply_purchase(), which this file creates.
--
-- What it does:
--   1. Adds plan expiry, comp flag, Stripe customer id and a lifetime scan
--      counter to user_subscriptions.
--   2. Converts old `trial` rows to `free`; marks hand-upgraded paid rows as comp.
--   3. Adds stripe_events (webhook idempotency) and purchases (audit trail).
--   4. Adds claim_scan(), apply_purchase() and revoke_purchase(): atomic,
--      service-role only.
--   5. Stops users from inserting/updating/deleting user_websites directly
--      (that let anyone free a slot or add sites without paying). The scan
--      delete trigger now runs as SECURITY DEFINER so deleting a scan still
--      frees the slot.
--   6. Drops the (email, plan) unique index on plan_requests so every request
--      is kept (the route now INSERTs instead of upserting).
--
-- Limits (sites per plan, free scans) are NOT stored here. They live in
-- lib/entitlements.ts and are passed into claim_scan()/apply_purchase().

begin;

-- ─── 1. Subscription columns ────────────────────────────────────────────────

alter table public.user_subscriptions
	add column if not exists plan_expires_at timestamptz,
	add column if not exists is_comp boolean not null default false,
	add column if not exists stripe_customer_id text,
	add column if not exists scans_used_total integer not null default 0;

comment on column public.user_subscriptions.plan_expires_at is
	'End of the paid 6-month term. NULL with is_comp = true means no expiry.';
comment on column public.user_subscriptions.is_comp is
	'Complimentary (hand-granted) plan, not paid through Stripe.';
comment on column public.user_subscriptions.scans_used_total is
	'Lifetime scans claimed. Never decremented (deleting a scan does not refund it).';

-- Backfill the lifetime counter from saved scans.
update public.user_subscriptions s
set scans_used_total = greatest(s.scans_used_total, c.n)
from (
	select user_id, count(*)::int as n
	from public.scans
	group by user_id
) c
where c.user_id = s.user_id;

-- ─── 2. Existing data ───────────────────────────────────────────────────────

-- The trial tier no longer exists.
update public.user_subscriptions
set tier = 'free', websites_limit = 1, trial_expires_at = null
where tier = 'trial';

-- Paid tiers set by hand before Stripe existed become comp accounts with no
-- expiry. Give a comp account an end date afterwards with:
--   update public.user_subscriptions set plan_expires_at = now() + interval '6 months'
--   where user_id = '<uuid>';
update public.user_subscriptions
set is_comp = true
where tier in ('starter', 'pro', 'business', 'agency')
	and plan_expires_at is null;

-- ─── 3. Stripe tables ───────────────────────────────────────────────────────

create table if not exists public.stripe_events (
	id text primary key,
	type text not null,
	received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
-- No policies: only the service role (webhook) reads or writes this table.

create table if not exists public.purchases (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete cascade,
	tier text not null check (tier in ('starter', 'pro')),
	status text not null check (status in ('applied', 'needs_review', 'refunded')),
	stripe_session_id text not null unique,
	stripe_payment_intent_id text,
	amount_total integer,
	currency text,
	period_start timestamptz,
	period_end timestamptz,
	created_at timestamptz not null default now()
);
create index if not exists purchases_user_id_idx on public.purchases (user_id);
alter table public.purchases enable row level security;

drop policy if exists "Users can view own purchases" on public.purchases;
create policy "Users can view own purchases"
	on public.purchases for select
	to authenticated
	using (auth.uid() = user_id);

-- ─── 4a. claim_scan ─────────────────────────────────────────────────────────
-- Atomically: check the lifetime scan limit, reserve the site slot (or touch
-- the existing site), and count the scan. Called by /api/analyze AFTER the
-- model call succeeds, so a failed analysis never burns a free scan.
-- Returns: 'ok' | 'scan_limit' | 'site_limit' | 'no_subscription'.

create or replace function public.claim_scan(
	p_user_id uuid,
	p_domain text,
	p_url text,
	p_max_sites integer,
	p_max_lifetime_scans integer -- NULL = unlimited
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
	v_used integer;
	v_sites integer;
begin
	select scans_used_total into v_used
	from user_subscriptions
	where user_id = p_user_id
	for update;

	if not found then
		return 'no_subscription';
	end if;

	if p_max_lifetime_scans is not null and v_used >= p_max_lifetime_scans then
		return 'scan_limit';
	end if;

	if exists (
		select 1 from user_websites
		where user_id = p_user_id and domain = p_domain
	) then
		update user_websites
		set last_scanned_at = now()
		where user_id = p_user_id and domain = p_domain;
	else
		select count(*) into v_sites
		from user_websites
		where user_id = p_user_id;

		if v_sites >= p_max_sites then
			return 'site_limit';
		end if;

		insert into user_websites (user_id, domain, url, last_scanned_at)
		values (p_user_id, p_domain, p_url, now());
	end if;

	update user_subscriptions
	set scans_used_total = scans_used_total + 1
	where user_id = p_user_id;

	return 'ok';
end;
$$;

-- ─── 4b. apply_purchase ─────────────────────────────────────────────────────
-- Called by the Stripe webhook. Idempotent on both the event id and the
-- Checkout Session id.
--   * same plan, still active, has an end date -> new term starts at the
--     current end date (repeat purchase extends)
--   * new plan, upgrade, expired, or comp      -> new term starts now
--   * active higher plan buying a lower one    -> recorded as needs_review,
--     nothing changes (checkout blocks this; it only happens in a race)
-- Returns: 'applied' | 'needs_review' | 'duplicate_event' | 'duplicate_session'.

create or replace function public.apply_purchase(
	p_event_id text,
	p_event_type text,
	p_user_id uuid,
	p_tier text,
	p_websites integer,
	p_term_months integer,
	p_session_id text,
	p_payment_intent_id text,
	p_customer_id text,
	p_amount_total integer,
	p_currency text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
	v_sub user_subscriptions%rowtype;
	v_active boolean;
	v_rank_current integer;
	v_rank_new integer;
	v_start timestamptz;
	v_end timestamptz;
begin
	if p_tier not in ('starter', 'pro') then
		raise exception 'apply_purchase: invalid tier %', p_tier;
	end if;

	insert into stripe_events (id, type)
	values (p_event_id, p_event_type)
	on conflict (id) do nothing;
	if not found then
		return 'duplicate_event';
	end if;

	if exists (select 1 from purchases where stripe_session_id = p_session_id) then
		return 'duplicate_session';
	end if;

	select * into v_sub
	from user_subscriptions
	where user_id = p_user_id
	for update;

	if not found then
		insert into user_subscriptions (user_id, tier, websites_limit)
		values (p_user_id, 'free', 1)
		returning * into v_sub;
	end if;

	v_active := v_sub.tier in ('starter', 'pro')
		and (
			v_sub.plan_expires_at > now()
			or (v_sub.is_comp and v_sub.plan_expires_at is null)
		);
	v_rank_current := case v_sub.tier when 'pro' then 2 when 'starter' then 1 else 0 end;
	v_rank_new := case p_tier when 'pro' then 2 else 1 end;

	if v_active and v_rank_current > v_rank_new then
		insert into purchases (
			user_id, tier, status, stripe_session_id, stripe_payment_intent_id,
			amount_total, currency
		) values (
			p_user_id, p_tier, 'needs_review', p_session_id, p_payment_intent_id,
			p_amount_total, p_currency
		);
		return 'needs_review';
	end if;

	if v_active and v_rank_current = v_rank_new and v_sub.plan_expires_at is not null then
		v_start := v_sub.plan_expires_at;
	else
		v_start := now();
	end if;
	v_end := v_start + make_interval(months => p_term_months);

	update user_subscriptions
	set tier = p_tier,
		websites_limit = p_websites,
		plan_expires_at = v_end,
		is_comp = false,
		trial_expires_at = null,
		stripe_customer_id = coalesce(p_customer_id, stripe_customer_id)
	where user_id = p_user_id;

	insert into purchases (
		user_id, tier, status, stripe_session_id, stripe_payment_intent_id,
		amount_total, currency, period_start, period_end
	) values (
		p_user_id, p_tier, 'applied', p_session_id, p_payment_intent_id,
		p_amount_total, p_currency, v_start, v_end
	);

	return 'applied';
end;
$$;

-- ─── 4c. revoke_purchase ────────────────────────────────────────────────────
-- Called by the Stripe webhook on a FULL refund (charge.refunded).
--   * refunded purchase is the user's latest term -> the plan ends now (or,
--     for a not-yet-started extension, at that extension's start)
--   * an older purchase while a later one exists  -> needs_review (manual)
-- Returns: 'revoked' | 'needs_review' | 'not_found' | 'duplicate_event'.

create or replace function public.revoke_purchase(
	p_event_id text,
	p_event_type text,
	p_payment_intent_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
	v_purchase purchases%rowtype;
	v_expires timestamptz;
begin
	insert into stripe_events (id, type)
	values (p_event_id, p_event_type)
	on conflict (id) do nothing;
	if not found then
		return 'duplicate_event';
	end if;

	select * into v_purchase
	from purchases
	where stripe_payment_intent_id = p_payment_intent_id
		and status = 'applied'
	for update;

	if not found then
		return 'not_found';
	end if;

	select plan_expires_at into v_expires
	from user_subscriptions
	where user_id = v_purchase.user_id
	for update;

	if v_expires is distinct from v_purchase.period_end then
		update purchases set status = 'needs_review' where id = v_purchase.id;
		return 'needs_review';
	end if;

	update user_subscriptions
	set plan_expires_at = greatest(v_purchase.period_start, now())
	where user_id = v_purchase.user_id;

	update purchases set status = 'refunded' where id = v_purchase.id;
	return 'revoked';
end;
$$;

revoke all on function public.revoke_purchase(text, text, text)
	from public, anon, authenticated;
grant execute on function public.revoke_purchase(text, text, text)
	to service_role;

revoke all on function public.claim_scan(uuid, text, text, integer, integer)
	from public, anon, authenticated;
grant execute on function public.claim_scan(uuid, text, text, integer, integer)
	to service_role;

revoke all on function public.apply_purchase(text, text, uuid, text, integer, integer, text, text, text, integer, text)
	from public, anon, authenticated;
grant execute on function public.apply_purchase(text, text, uuid, text, integer, integer, text, text, text, integer, text)
	to service_role;

-- ─── 5. Website slots are server-managed ────────────────────────────────────

drop policy if exists "Users can insert own websites" on public.user_websites;
drop policy if exists "Users can update own websites" on public.user_websites;
drop policy if exists "Users can delete own websites" on public.user_websites;
-- "Users can view own websites" (SELECT) stays.

-- The scan delete trigger used to run as the deleting user. With the DELETE
-- policy gone it must run as owner, or slots would never be freed.
create or replace function public.cleanup_user_website_on_scan_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if not exists (
		select 1 from scans
		where user_id = old.user_id
			and domain = old.domain
	) then
		delete from user_websites
		where user_id = old.user_id
			and domain = old.domain;
	end if;
	return old;
end;
$$;

-- Signup trigger: same behaviour, plus a pinned search_path and no failure if
-- the row already exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.user_subscriptions (user_id, tier, websites_limit)
	values (new.id, 'free', 1)
	on conflict (user_id) do nothing;
	return new;
end;
$$;

-- ─── 6. plan_requests keeps every request ───────────────────────────────────

drop index if exists public.plan_requests_email_plan_idx;

commit;
