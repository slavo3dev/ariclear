-- 20261117000000_retention.sql
--
-- Phase 4 (retention). NOT APPLIED. Additive: run it BEFORE deploying, right
-- after 20261116000000_server_save_and_rate_limits.sql.
--
-- What it does:
--   1. normalize_domain() (same definition as 20261116000200; whichever runs
--      first creates it).
--   2. scans.technical_score: the deterministic technical score saved with
--      each scan, for the History trend.
--   3. rewrite_tests: every "Test your rewrite" attempt, readable by its owner.
--   4. user_subscriptions.email_digest: opt-out for the re-scan email.
--   5. record_scan(): final version. Normalises the domain and stores
--      technical_score. Replaces the version from part A.
--   6. due_rescans(): the sites the scheduled re-scan should run next.

begin;

-- ─── 1. normalize_domain ────────────────────────────────────────────────────

create or replace function public.normalize_domain(p text)
returns text
language sql
immutable
set search_path = public
as $$
	select regexp_replace(rtrim(lower(btrim(p)), '.'), '^www\.', '')
$$;

-- ─── 2. Technical score on scans ────────────────────────────────────────────

alter table public.scans
	add column if not exists technical_score integer
		check (technical_score is null or technical_score between 0 and 100);

create index if not exists scans_user_domain_created_idx
	on public.scans (user_id, domain, created_at desc);

-- ─── 3. Saved rewrite tests ─────────────────────────────────────────────────

create table if not exists public.rewrite_tests (
	id uuid primary key default gen_random_uuid(),
	scan_id uuid not null references public.scans (id) on delete cascade,
	user_id uuid not null references auth.users (id) on delete cascade,
	headline text not null,
	subheadline text,
	cta text,
	before_score integer not null check (before_score between 0 and 100),
	after_score integer not null check (after_score between 0 and 100),
	baseline_source text not null check (baseline_source in ('live', 'saved')),
	result jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now()
);
create index if not exists rewrite_tests_scan_idx
	on public.rewrite_tests (scan_id, created_at desc);

alter table public.rewrite_tests enable row level security;

drop policy if exists "Users can view own rewrite tests" on public.rewrite_tests;
create policy "Users can view own rewrite tests"
	on public.rewrite_tests for select
	to authenticated
	using (auth.uid() = user_id);
-- Writes only from the server (service role) after scoring.
revoke insert, update, delete on table public.rewrite_tests from anon, authenticated;

-- ─── 4. Digest opt-out ──────────────────────────────────────────────────────

alter table public.user_subscriptions
	add column if not exists email_digest boolean not null default true;

-- ─── 5. record_scan (final) ─────────────────────────────────────────────────

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
	v_domain text := normalize_domain(p_domain);
	r scans%rowtype;
begin
	v_status := claim_scan(p_user_id, v_domain, p_url, p_max_sites, p_max_lifetime_scans);
	if v_status <> 'ok' then
		return query select v_status, null::uuid;
		return;
	end if;

	r := jsonb_populate_record(null::scans, p_scan);

	insert into scans (
		user_id, domain, url,
		overall_score, human_score, ai_score, technical_score,
		human_clarity_description, human_value_prop, human_audience, human_confusions,
		ai_comprehension, ai_indexer_read, ai_missing_keywords,
		suggested_headline, suggested_subheadline, suggested_cta,
		action_plan, ai_prompt, issues, checklist, suggestions
	) values (
		p_user_id, v_domain, p_url,
		coalesce(r.overall_score, 0), coalesce(r.human_score, 0), coalesce(r.ai_score, 0),
		r.technical_score,
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

-- ─── 6. due_rescans ─────────────────────────────────────────────────────────
-- Sites of users with an ACTIVE paid plan (paid tier and a future end date,
-- or comp with no end date) whose last scan is older than p_min_age.
-- Oldest first, at most p_limit rows.

create or replace function public.due_rescans(
	p_limit integer,
	p_min_age interval
)
returns table (user_id uuid, domain text, url text, last_scanned_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
	select w.user_id, w.domain, w.url, w.last_scanned_at
	from user_websites w
	join user_subscriptions s on s.user_id = w.user_id
	where s.tier in ('starter', 'pro')
		and (s.plan_expires_at > now() or (s.is_comp and s.plan_expires_at is null))
		and (w.last_scanned_at is null or w.last_scanned_at < now() - p_min_age)
	order by w.last_scanned_at asc nulls first
	limit greatest(0, least(p_limit, 100))
$$;

revoke all on function public.due_rescans(integer, interval)
	from public, anon, authenticated;
grant execute on function public.due_rescans(integer, interval)
	to service_role;

commit;
