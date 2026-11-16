-- 20261118000000_legion_plan.sql
--
-- NOT APPLIED. Safe to run before or after the deploy of the Legion code
-- (it only widens what is allowed).
--
-- Legion: more than 3 sites at a price agreed by contact. There is no new
-- tier: a Legion customer is a Centurion ('pro') account with a higher
-- user_subscriptions.websites_limit, set by hand after the deal.
--
--   1. plan_requests accepts plan = 'legion' (any old CHECK on plan or
--      websites is replaced; an enum-typed plan column becomes text) and
--      gets a status column to track each lead.
--   2. apply_purchase() keeps a higher custom site limit when an ACTIVE
--      customer renews through Stripe checkout. Before, a Legion customer
--      who bought Centurion again dropped back to 3 sites. An expired
--      customer who buys again gets the plan's normal limit.

begin;

-- ─── 1. plan_requests ───────────────────────────────────────────────────────

do $$
declare
	c record;
begin
	if (select data_type from information_schema.columns
		where table_schema = 'public' and table_name = 'plan_requests' and column_name = 'plan')
		= 'USER-DEFINED' then
		alter table public.plan_requests alter column plan type text using plan::text;
	end if;

	for c in
		select con.conname
		from pg_constraint con
		join pg_attribute att
			on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
		where con.conrelid = 'public.plan_requests'::regclass
			and con.contype = 'c'
			and att.attname in ('plan', 'websites')
	loop
		execute format('alter table public.plan_requests drop constraint %I', c.conname);
	end loop;
end;
$$;

-- NOT VALID: old rows are not re-checked, new rows must comply.
alter table public.plan_requests
	add constraint plan_requests_plan_check
		check (plan in ('starter', 'pro', 'legion')) not valid,
	add constraint plan_requests_websites_check
		check (websites between 1 and 1000) not valid;

alter table public.plan_requests
	add column if not exists status text not null default 'new';
alter table public.plan_requests
	drop constraint if exists plan_requests_status_check;
alter table public.plan_requests
	add constraint plan_requests_status_check
		check (status in ('new', 'contacted', 'won', 'lost'));

comment on column public.plan_requests.status is
	'Lead status, updated by hand: new -> contacted -> won | lost.';

-- ─── 2. apply_purchase keeps a custom site limit ────────────────────────────

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
		-- Keep a higher custom limit (Legion) while the plan is active.
		websites_limit = greatest(
			p_websites,
			case when v_active then coalesce(v_sub.websites_limit, 0) else 0 end
		),
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

-- create or replace keeps existing grants; restate them to be explicit.
revoke all on function public.apply_purchase(text, text, uuid, text, integer, integer, text, text, text, integer, text)
	from public, anon, authenticated;
grant execute on function public.apply_purchase(text, text, uuid, text, integer, integer, text, text, text, integer, text)
	to service_role;

commit;
