-- 20261116000200_normalize_domains.sql
--
-- Phase 2 follow-up. NOT APPLIED. Run it AFTER the Phase 2 code is deployed
-- (together with 20261116000100_lock_scan_writes.sql).
--
-- www.example.com and example.com are the same site:
--   1. normalize_domain(): lower-case, trailing dot removed, leading "www."
--      removed. Must match lib/domain.ts.
--   2. A user who has both forms keeps ONE site row (the oldest, with the
--      latest last_scanned_at), so the duplicate slot is freed.
--   3. Existing site and scan rows are rewritten to the normalised domain.
--   4. claim_scan() normalises the domain itself, so the rule holds whatever
--      the caller sends. (record_scan() normalises too: see
--      20261117000000_retention.sql, which runs before the deploy.)

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

-- ─── 2. Merge duplicate site rows 

update public.user_websites k
set last_scanned_at = g.latest
from (
	select user_id, public.normalize_domain(domain) as nd, max(last_scanned_at) as latest
	from public.user_websites
	group by 1, 2
	having count(*) > 1
) g
where k.user_id = g.user_id
	and public.normalize_domain(k.domain) = g.nd;

delete from public.user_websites w
using public.user_websites k
where w.user_id = k.user_id
	and public.normalize_domain(w.domain) = public.normalize_domain(k.domain)
	and (k.created_at, k.id) < (w.created_at, w.id);

-- ─── 3. Rewrite existing rows ───────────────────────────────────────────────

update public.user_websites
set domain = public.normalize_domain(domain)
where domain <> public.normalize_domain(domain);

-- The delete trigger only fires on DELETE, so this update cannot free slots.
update public.scans
set domain = public.normalize_domain(domain)
where domain <> public.normalize_domain(domain);

-- ─── 4. claim_scan normalises too ─────────────────────────────────────────

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
	v_domain text := normalize_domain(p_domain);
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
		where user_id = p_user_id and domain = v_domain
	) then
		update user_websites
		set last_scanned_at = now()
		where user_id = p_user_id and domain = v_domain;
	else
		select count(*) into v_sites
		from user_websites
		where user_id = p_user_id;

		if v_sites >= p_max_sites then
			return 'site_limit';
		end if;

		insert into user_websites (user_id, domain, url, last_scanned_at)
		values (p_user_id, v_domain, p_url, now());
	end if;

	update user_subscriptions
	set scans_used_total = scans_used_total + 1
	where user_id = p_user_id;

	return 'ok';
end;
$$;

-- create or replace keeps existing grants; restate them to be explicit.
revoke all on function public.claim_scan(uuid, text, text, integer, integer)
	from public, anon, authenticated;
grant execute on function public.claim_scan(uuid, text, text, integer, integer)
	to service_role;

commit;
