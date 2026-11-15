-- 20261115000000_security_hotfix.sql
--
-- ALREADY APPLIED in production by hand on 2026-11-15 (SQL Editor).
-- Recorded here so the repo matches the database. Every statement is
-- idempotent, so running it again is harmless.
--
-- Closes:
--   1. Any signed-in user could UPDATE their own user_subscriptions row
--      (tier, websites_limit) with the public anon key.
--   2. plan_requests had RLS disabled, so leads (email, phone) were readable
--      with the public anon key.
--   3. user_website_counts view and two SECURITY DEFINER functions exposed
--      other users' counts and plans to anon/authenticated.
--
-- The app never used any of these permissions (no .rpc calls, no view reads,
-- no client-side subscription updates), so nothing breaks.

drop policy if exists "Users can update own subscription" on public.user_subscriptions;

alter table public.plan_requests enable row level security;

revoke select on public.user_website_counts from anon, authenticated;

revoke execute on function public.can_add_website(uuid) from public, anon, authenticated;
revoke execute on function public.get_user_subscription(uuid) from public, anon, authenticated;
