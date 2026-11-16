-- 20261116000000_server_save_and_rate_limits.sql
--
-- Phase 2, part A. NOT APPLIED. Additive only: safe to run while the Phase 1
-- code is still live. Run it BEFORE deploying the Phase 2 code.
-- Part B (20261116000100_lock_scan_writes.sql) runs AFTER the deploy.
--
-- What it does:
--   1. record_scan(): claims the scan (same rules as claim_scan) and saves the
--      report in ONE transaction. /api/analyze calls it with the report it
--      built itself, so users can no longer submit their own scores.
--   2. rate_limits + rate_limit_hit(): shared fixed-window rate limiting for
--      all server instances. Keys arrive already hashed; no ids or IPs stored.
-- Both functions are service-role only.

begin;

-- ─── 1. record_scan ─────────────────────────────────────────────────────────
-- Returns one row: (status, scan_id)
--   status = 'ok'               -> scan_id is the saved scan
--   status = 'scan_limit' | 'site_limit' | 'no_subscription' -> nothing saved

create or replace function public.record_scan(
	p_user_id uuid,
	p_domain text,
	p_url text,
	p_max_sites integer,
	p_max_lifetime_scans integer, -- NULL = unlimited
	p_scan jsonb
)
returns table (status text, scan_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
	v_status text;
	v_id uuid;
	r scans%rowtype;
begin
	v_status := claim_scan(p_user_id, p_domain, p_url, p_max_sites, p_max_lifetime_scans);
	if v_status <> 'ok' then
		return query select v_status, null::uuid;
		return;
	end if;

	r := jsonb_populate_record(null::scans, p_scan);

	insert into scans (
		user_id, domain, url,
		overall_score, human_score, ai_score,
		human_clarity_description, human_value_prop, human_audience, human_confusions,
		ai_comprehension, ai_indexer_read, ai_missing_keywords,
		suggested_headline, suggested_subheadline, suggested_cta,
		action_plan, ai_prompt, issues, checklist, suggestions
	) values (
		p_user_id, p_domain, p_url,
		coalesce(r.overall_score, 0), coalesce(r.human_score, 0), coalesce(r.ai_score, 0),
		r.human_clarity_description, r.human_value_prop, r.human_audience,
		coalesce(r.human_confusions, '[]'::jsonb),
		r.ai_comprehension, r.ai_indexer_read, coalesce(r.ai_missing_keywords, '[]'::jsonb),
		r.suggested_headline, r.suggested_subheadline, r.suggested_cta,
		coalesce(r.action_plan, '[]'::jsonb), r.ai_prompt,
		coalesce(r.issues, '[]'::jsonb), coalesce(r.checklist, '[]'::jsonb),
		coalesce(r.suggestions, '[]'::jsonb)
	)
	returning id into v_id;

	return query select 'ok'::text, v_id;
end;
$$;

revoke all on function public.record_scan(uuid, text, text, integer, integer, jsonb)
	from public, anon, authenticated;
grant execute on function public.record_scan(uuid, text, text, integer, integer, jsonb)
	to service_role;

-- ─── 2. Shared rate limits ──────────────────────────────────────────────────

create table if not exists public.rate_limits (
	key text not null,
	window_start timestamptz not null,
	hits integer not null default 0,
	primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
-- No policies: only the service role touches this table.

create or replace function public.rate_limit_hit(
	p_key text,
	p_max integer,
	p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
	v_window timestamptz;
	v_hits integer;
begin
	if p_window_seconds < 1 or p_max < 0 then
		raise exception 'rate_limit_hit: invalid arguments';
	end if;

	v_window := to_timestamp(
		floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
	);

	insert into rate_limits as rl (key, window_start, hits)
	values (p_key, v_window, 1)
	on conflict (key, window_start)
	do update set hits = rl.hits + 1
	returning rl.hits into v_hits;

	-- Opportunistic cleanup (about 1 call in 100). Longest window is 1 day.
	if random() < 0.01 then
		delete from rate_limits where window_start < now() - interval '2 days';
	end if;

	return query select
		v_hits <= p_max,
		greatest(
			0,
			ceil(extract(epoch from (v_window + make_interval(secs => p_window_seconds) - now())))::integer
		);
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer)
	from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer)
	to service_role;

commit;
