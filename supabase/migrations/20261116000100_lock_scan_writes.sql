-- 20261116000100_lock_scan_writes.sql
--
-- Phase 2, part B. NOT APPLIED. Run it AFTER the Phase 2 code is deployed.
-- (The Phase 1 code still saves scans from the browser-facing route; running
-- this before the deploy would make those saves fail.)
--
-- Users can no longer insert or edit scan rows directly. Scans are written
-- only by record_scan() (called from /api/analyze), and the checklist is
-- updated by /api/scans/[id] with the service role after an ownership check.
-- Users keep SELECT and DELETE on their own scans.

begin;

drop policy if exists "Users can insert own scans" on public.scans;
drop policy if exists "Users can update own scans" on public.scans;

-- Belt and braces: without these privileges a future permissive policy
-- still would not let the browser write scans.
revoke insert, update on table public.scans from anon, authenticated;

commit;
