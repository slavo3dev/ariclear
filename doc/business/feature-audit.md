# AriClear — Feature Audit: What to Keep, Cut and Build

> Goal: before wiring Stripe, decide which features earn a place. Method: (1) what each feature costs us to keep, from the code; (2) what the market actually pays for, from web research (Oct 2026); (3) a keep / park / cut call per feature.
> Evidence labels: `[code]` verified in the repo · `[web]` public sources (§8) · `[assumption]` my judgement, validate with users. There is **no AriClear usage data** in the repo, so "nobody uses X" cannot be proven — check Supabase/GA before deleting anything with existing user data.

---

> **Status (Oct 2026): Step B cleanup executed** for video, Ask Ari and monitor; Brand Awareness parked; dashboard kept for now. Details: [../architecture/features/README.md](../architecture/features/README.md).

## 1. The conclusion first

The app is **~16k lines across 8 features**, but one core loop (scan → score → fix → re-scan) carries the whole value. **About 46% of the TypeScript (~7,350 lines) sits in four side features** that are either commodity, unproven, or not working `[code]`:

| Side feature | Lines | Verdict |
|---|---|---|
| AI recap video (Remotion, Gemini, TTS, Replicate, Cloudinary) | ~3,620 | **Cut** (park in git history) |
| Ask Ari expert Q&A board | ~1,790 | **Cut**, replace with a paid "expert review" booking link |
| Brand Awareness analyzer | ~1,430 | **Park** (hide), reuse prompts for the AI-visibility check |
| Website monitor | ~520 | **Cut** |

Cutting them removes **5 of 7 third-party vendors** (Gemini, Google TTS, Replicate, Cloudinary, Remotion) and ~8 npm dependencies, leaves one AI vendor + Supabase + Stripe, and shrinks the surface that must be secured, priced and supported. What is left is easier to explain, which matters for a product that sells *clarity*.

Then **build one thing the market clearly pays for**: a small **AI-visibility check** (is the business named by ChatGPT/Perplexity/Gemini for its category, and who is named instead?) and **real re-scan tracking**.

## 2. What people actually need (research) `[web]`

1. **Small businesses want answers to four questions, not dashboards:** are customers seeing my brand, which competitors appear instead, which sites are cited, and *what should I improve*. "Actionable insights" is a top evaluation criterion for these tools; nearly six in ten small businesses say they **don't know where to start** with AI search optimization. → AriClear's "rewrite + action plan" is aligned; the *measurement* half is missing.
2. **AI-visibility tools are where money is moving:** Profound ($35M Series B), Peec AI (~$29M raised, fast ARR), Otterly from ~$29/mo, Rankscale ~€20/mo, HubSpot AEO ~$45–50/mo plus a **free** grader. Buyers anchor at **$20–100/month**. → Your $39/6 months ($6.50/mo) and $99/6 months ($16.50/mo) are well below this; room to charge more once measurement exists.
3. **Productized audits sell at $49–$300:** Landing Doctors full report $49 (free 60-second preview of top 3 issues), freelance landing-page audits $90–$300, expert calls ~$800. → Proof that "a clear written fix list" is bought one-off; and that **human review is a paid add-on, not something to bundle** at $6.50/month.
4. **Free graders are the funnel, not the product:** HubSpot's Website Grader has run as a lead engine since 2006. Freemium-to-paid typically converts **~2.6–5%**. → Keep a free taste (the demo scan) and gate the full report; don't give away the rewrite.
5. **Uptime monitoring is a solved, free commodity:** UptimeRobot free = 50 monitors, 5-min checks (non-commercial), paid from ~$9/mo; Better Stack free = 10 monitors with status page. → A manual "ping now" page cannot compete and isn't continuous monitoring `[code]`.
6. **No evidence in the research** that SMBs/founders buy: AI-generated recap videos of a scan, or a community Q&A board attached to an audit tool. Those are hypotheses with a high build/ops cost.

## 3. Feature scorecard

Scoring: **Need** (does research show people pay for it), **Moat** (hard to copy), **Cost** (build + run + risk), **State** `[code]`. Scale 1–5 (5 = best; for Cost, 5 = cheap).

| # | Feature | Need | Moat | Cost-to-keep | State today | Decision |
|---|---|---|---|---|---|---|
| 1 | Core scan: Human Clarity + AI-SEO score, rewrite, action plan | 5 | 2 | 5 (≈$0.002/scan) | Works; needs auth fix (done), scoring consistency | **KEEP — the product** |
| 2 | Public demo scan (teaser) | 5 | 1 | 5 | Works, now SSRF-safe + limited | **KEEP — acquisition** |
| 3 | Scan history | 4 | 3 | 4 | Works; **no trend/progress**, checklist not saved | **KEEP + finish** (this is retention) |
| 4 | Dashboard | 2 | 1 | 4 | Duplicates history; had API mismatches | **MERGE into history** |
| 5 | PDF report | 4 | 1 | 5 | Works client-side | **KEEP, gate to paid** (agency/founder deliverable) |
| 6 | Auth + accounts | 5 | – | 4 | Works; open redirect fixed | **KEEP** |
| 7 | Plans + checkout | 5 | – | 3 | **Missing (lead form only)** | **BUILD (Stripe, tomorrow)** |
| 8 | Brand Awareness analyzer | 3 | 3 | 2 | Works, 2nd scoring system, results not saved, not gated | **PARK** — hide from nav/pricing; mine for AI-visibility check |
| 9 | Website monitor | 1 | 1 | 4 | One-shot manual ping; commodity | **CUT** |
| 10 | Ask Ari Q&A board | 2 | 2 | 1 (1,790 lines, realtime, admin tooling, service-role, no quota) | Was broken; no notifications | **CUT** → paid expert review via booking link |
| 11 | AI recap video | 2 `[assumption]` | 3 | 1 (5 vendors, Chromium render, ~$0.1–0.5/video, can't run on serverless) | Was broken (5 vs 4 scenes), images unused | **CUT** (revisit as shareable score *image* later) |
| 12 | Waitlist + plan-request forms | 3 | – | 4 | Works; becomes obsolete with Stripe | **REMOVE after Stripe is live** |
| 13 | **AI-visibility check** (not built) | **5** | 4 | 3 | — | **BUILD (next)** |
| 14 | **Scheduled re-scan + email** (not built) | 5 | 3 | 3 | — | **BUILD** |
| 15 | Agency white-label / multi-site (not built) | 4 | 3 | 3 | — | Later |

### Why park Brand Awareness instead of cutting
It is the only feature that cross-checks *what a brand claims* against *what its site says*, and its prompt already extracts entity data (category, customer, differentiator, location, price signal). That is the raw material for the AI-visibility check. But as shipped it is a **second, differently-scored report** that dilutes the story and isn't saved or gated. Hide it from the navbar and pricing; keep the files until the AI-visibility check reuses the logic.

### Why cut Ask Ari rather than fix it
It's a community-style product (post, reply, comment, admin moderation, realtime) bolted onto a scanner. The research shows buyers pay for a **finished written review**, not a forum. It also costs founder time at a price (~$6.50/mo) that cannot support it. Replace with one line: *"Want a human review? Book a 30-min expert review — $X"* using the existing Calendly link, charged separately via Stripe.
**Check first:** count rows in `questions`/`comments` and who they belong to. If real users have open threads, export and notify them before removing.

### Why cut the video
It is the most expensive and fragile path in the repo (Gemini script → Google TTS → Replicate SDXL → Cloudinary → Remotion CLI render in a Next route), and the composition doesn't even use the generated images `[code]`. The "viral share" idea is plausible but **untested**; the cheapest way to test it is a **static shareable score card (image/OG) with a badge**, not a rendered video. Keep the idea, delete the pipeline.

## 4. Recommended product after cleanup

```
Landing + free demo scan (teaser)
        │ sign up
        ▼
Full scan  ──►  Score (human + AI) · rewrite · action plan · PDF
        │
        ▼
History + trend  ◄── scheduled re-scan + email  (retention)
        │
        ▼
AI-visibility check (mentioned? cited? who instead?)   ← build next
        │
Add-on: expert review (paid, booked via link)
```

Plans after cleanup (internal keys unchanged: `starter`, `pro`):

| | Gladiator `starter` | Centurion `pro` |
|---|---|---|
| Price | $39 / 6 months | $99 / 6 months |
| Websites | 1 | 3 |
| Full scans, rewrites, action plan, history/trend, PDF | ✓ | ✓ |
| Scheduled re-scan + email | monthly | weekly |
| AI-visibility check | — | ✓ (limited prompts) |
| Expert review | add-on | add-on (or 1 included per term) |

Drop from the pricing page: uptime monitoring, Brand Awareness tool, "expert sessions / month".

## 5. Cleanup plan (ordered, each step reversible via git)

**Step A — before Stripe (tomorrow's prep, no deletions):**
1. Decide the cuts above (you approve).
2. Export any existing `questions`/`comments`/`video_jobs` rows if present.

**Step B — delete (one commit per feature):**
1. *Video:* remove `app/api/video/**`, `lib/video/**`, `remotion/**`, `remotion.config.ts`, `app/scan/[id]/{VideoCreatorPanel,VideoPlayer,ScanRecapVideo}.tsx` and their use in `scan/[id]/page.tsx`, `ScanResultsClient.tsx`, `scan/page.tsx` (it auto-renders after every scan); drop `serverExternalPackages` in `next.config.ts`; remove `remotion:*` scripts. Dependencies to remove: `remotion`, `@remotion/{bundler,cli,renderer}`, `replicate`, `cloudinary`, `@google-cloud/text-to-speech`, `@google/generative-ai`. Env vars to drop: `GEMINI_API_KEY`, `REPLICATE_API_TOKEN`, `CLOUDINARY_*`, Google TTS creds. DB: leave `video_jobs` until confirmed empty, then drop.
2. *Ask Ari:* remove `app/ask-ari/**`, `app/api/ask-ari/**`, `app/api/admin/**`, Navbar links; keep a "Book an expert review" link. DB: archive then drop `questions`, `comments`, `admin_users`.
3. *Monitor:* remove `app/website-monitor/**`, `app/api/check-site/**`, Navbar links.
4. *Brand Awareness:* remove from Navbar/pricing only (route stays hidden or behind login) — physically delete later if AI-visibility check doesn't reuse it.
5. *Dashboard:* redirect `/dashboard` → `/history`, then delete.
6. *Pricing copy:* update feature lists to §4; remove "expert sessions / month".

**Step C — after Stripe is live:** delete `plan-request` route + `PreorderForm` + `PreorderProvider`; keep or retire the waitlist (`preorder`, `mailcollection`).

Expected result: ~46% fewer lines, ~8 fewer dependencies, 5 fewer vendor accounts/keys, and four fewer places for security/pricing bugs.

## 6. Stripe: how to set up tomorrow `[web + assumption]`

- **Fees:** US cards 2.9% + $0.30; Checkout/Payment Links add no extra fee; Billing/subscriptions add ~0.5–0.7% of volume; international cards +1.5%; FX +1%; disputes $15 `[web]`. On $39 that is ≈ $1.43 (3.7%); on $99 ≈ $3.17 (3.2%).
- **Recommended model for "pay every 6 months": one-time Checkout payments, not subscriptions.** Create two Products with one-time Prices ($39, $99). On `checkout.session.completed` your webhook sets `user_subscriptions.tier` (`starter`/`pro`), `websites_limit` (1/3) and `expires_at = now + 6 months`. Simpler than subscriptions, no Billing fee, no failed-renewal logic. Later, an email "renew for another 6 months" link. (Trade-off: no automatic renewal revenue — consider true subscriptions once there is retention data.)
- **Account:** register under the legal entity/country that will receive payouts; Stripe will ask for business details, bank account and identity verification. Start in **test mode** and build everything against test keys first.
- **Keys/env:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, price IDs `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`.
- **What the code needs** (see feature doc 04): `POST /api/checkout` (creates a Checkout Session for the logged-in user, `client_reference_id = user.id`), `POST /api/webhooks/stripe` (verify signature on the **raw body**, idempotent by event id), one `lib/entitlements.ts` that maps tier → limits and checks expiry, and server-side enforcement in `scans`, PDF export and AI-visibility routes. Add a `stripe_customer_id`/`stripe_event_id` column or table.
- **Also needed to launch:** a Terms/Refund policy page and a privacy policy (Stripe and card networks expect them), and a clear 6-month refund stance.
- **Taxes:** consider Stripe Tax if you sell to EU/UK/other VAT regions.

## 7. Risks of cutting
- **Unknown usage:** if any cut feature has active users, you lose goodwill. Check data first (§5A).
- **Differentiation:** with video and Q&A gone, the product is "scan + rewrite + (soon) AI visibility". That's correct focus, but it must win on score quality and retention; commit to the eval set and re-scan stability (tech doc §9).
- **Revenue concentration:** one core loop means the free→paid conversion of the demo scan is the whole business. Instrument it (PostHog/GA events) before launch.

## 8. Sources `[web]`, retrieved Oct 2026
- [UptimeRobot pricing 2026 — Notifier](https://notifier.so/guides/uptimerobot-pricing-2026/) · [Better Stack vs UptimeRobot](https://betterstack.com/community/comparisons/better-stack-vs-uptimerobot/)
- [AI visibility tools for small businesses — Lighthouse Local](https://www.lighthouselocal.ai/blog/ai-search-visibility-tools-small-businesses) · [How small businesses win AI search — Global Payments](https://www.globalpayments.com/insights/how-small-businesses-win-ai-search) · [Top AI visibility tools for SMB — Indexly](https://indexly.ai/blog/ai-visibility-tools-for-small-businesses/)
- [Landing Doctors teardown ($49 report)](https://landingdoctors.com/teardowns/retool-com) · [Landing page audit — Contra](https://contra.com/s/Z7APFWgL-landing-page-audit) · [GTM teardown — CrowdTamers](https://crowdtamers.gumroad.com/l/teardown)
- [HubSpot Website Grader widget](https://www.hubspot.com/solutions-partner-resource-center/website-grader-widget) · [Free-to-paid conversion rates — Crazy Egg](https://www.crazyegg.com/blog/free-to-paid-conversion-rate/)
- [Stripe pricing breakdown 2026 — Flexprice](https://flexprice.io/blog/stripe-pricing-breakdown-2026) · [Stripe pricing — Toolradar](https://toolradar.com/tools/stripe/pricing)
- Competitor pricing/funding from the earlier market research: see [startup-doc.md](startup-doc.md) §15.

Caveats: prices change; several sources are vendor or affiliate blogs; Stripe fees vary by country — confirm in your Stripe dashboard.
