# AriClear — Startup Document

> Purpose: a working document to **improve the business**. It combines what the product actually is today (from the code), a market and competitor analysis (web research, Oct 2026), a diagnosis, and a prioritized plan with experiments.
>
> **Evidence labels:** `[code]` verified in the repository · `[web]` from public web sources listed in §14 (several are vendor/SEO blogs and market-research aggregators, so treat the numbers as directional) · `[assumption]` my reasoning, needs validation with real customers.
> This document contains **no AriClear traction data** (users, revenue, conversion) because none exists in the repo. Sections that need it are marked **TO FILL**.

---

## 1. One-paragraph summary

AriClear tells founders and small agencies whether **humans and AI can instantly understand their website**, then gives a rewrite-ready action plan. It is technically a working MVP: scan, history, PDF, monitor, brand-awareness analysis, expert Q&A and AI recap videos `[code]`. It is **not yet a business**: there is no billing (paid plans are an email lead form), no demonstrated retention loop, an under-defined buyer, and a feature set that is wider than its proof. The market tailwind is real (AI search/GEO tooling is a funded, fast-growing category `[web]`), but the money so far is going to *measurement* tools (does ChatGPT mention me?) while AriClear sells *diagnosis and copy fixes* — a gap and a risk at the same time.

**Core recommendation:** stop building features; (1) turn the free scan into a viral, shareable "clarity grade," (2) wire Stripe and sell one thing — a **$19–29/mo "fix + re-scan" plan** for founders and a **white-label audit** for agencies — and (3) add real AI-visibility measurement so the product can be taken seriously in the GEO category. Details in §10–§12.

## 2. Product today `[code]`

| Capability | State | Business role |
|---|---|---|
| 5-second Human Clarity score + issues, rewrite of headline/sub/CTA, action plan, copy-paste "rewrite prompt" | Working (`/api/analyze`) | Core value |
| AI-SEO / GEO score (LLM judgement of how classifiable the business is) | Working | Core value / positioning hook |
| Demo scan on landing page, 2 issues shown + "N hidden issues" | Working, per-IP limit | Top-of-funnel lead gen |
| Account, scan history, dashboard, score trend | Working | Retention |
| PDF report | Working (client-side) | Agency deliverable |
| Website uptime checker | Manual only, no scheduling | Weak; commodity (UptimeRobot is free) |
| Brand Awareness analyzer (6 metrics, cross-checks site vs stated brand, Claude) | Working | Differentiated, upsell |
| Ask Ari — human expert Q&A board; "3×/6× 30-min expert sessions" in paid tiers | Working board; sessions = manual | High-touch upsell, **doesn't scale** |
| AI recap video (Gemini + TTS + SDXL + Remotion) | Working locally; prod viability unverified | Share/viral hook, high COGS |
| Email waitlist + plan-request forms | Working | Pre-sell |
| Stripe / subscriptions / entitlements by tier | **Missing** | Blocks revenue |
| Scheduled re-scans, alerts, email digests | **Missing** | Blocks retention |
| Real AI-engine measurement (are we cited by ChatGPT/Perplexity?) | **Missing** | Blocks category credibility |

**Stated principles** (`Description.md`): brutally honest scoring, specific/contextual feedback, <10s scans. Honest assessment: the prompt delivers on tone and specificity; speed and score consistency are unmeasured (see tech doc §9).

## 3. Problem & customer

**Problem (validated by the category's existence, not by AriClear's own users):** most websites fail to say *what / for whom / do what*, and in 2026 an AI assistant is also a "first visitor" that summarizes the business to a buyer before they ever click.

**Customer segments**

| Segment | Pain | Willingness to pay `[assumption]` | Fit |
|---|---|---|---|
| **A. Solo founders / indie hackers / micro-SaaS** (stated primary) | "Is my landing page clear? Why no conversions?" | Low–medium; $10–30/mo, price-sensitive, churn after fixing site | Great for acquisition, weak for LTV |
| **B. Freelancers & small agencies (web/SEO/brand)** (stated secondary) | Need a fast, credible audit to win and justify work; are *selling* "AI SEO" now | **Highest** — a $199–499 audit tool that earns back on one client | **Best revenue segment** |
| C. SMB owners (local business, services) | "Why don't I show up in ChatGPT?" | Medium, but need hand-holding | Reachable via B |
| D. In-house marketers at SaaS | Want measurement, dashboards, competitors | High but they buy Peec/Profound/Semrush | Not a fit yet |

**Job to be done:** "Tell me in one minute what's wrong with my homepage message, show me the exact rewrite, and prove it improved." The *proof it improved* is the retention hook and is currently the weakest part (non-deterministic scoring).

## 4. Market analysis

### 4.1 Market definition
AriClear sits where three categories meet:
1. **GEO/AEO — AI-search visibility** (tracking + optimizing how brands appear in ChatGPT, Perplexity, Gemini, AI Overviews). Fastest growing, best funded.
2. **Website messaging / conversion clarity** (message testing, landing-page graders, 5-second tests). Mature, slower, partly commoditized by free AI graders.
3. **Agency audit & reporting tooling** (white-label SEO audits). Large, sticky, price-insensitive relative to value.

### 4.2 Size & growth `[web]`
- GEO-specific market estimated **~US$1.1–1.5B in 2026**, projected ~US$17B by 2034 (~40% CAGR) by one set of research firms; another set sizes GEO *platforms* at US$2.7B (2026) → US$26.9B (2033, ~14% CAGR) and GEO *services* at US$1.25B → US$13B. **The sources disagree by 2–3×; market-research aggregator figures are marketing, not data.** Use "low-single-digit billions today, growing fast" as the defensible statement.
- Behavioral indicators cited by multiple secondary sources: AI referrals ≈ 12–18% of web referral traffic (up from ~5–8% in late 2024), ChatGPT ≈ 900M weekly users, Google AI Overviews on 20–40% of (US) queries, zero-click searches ~65–70%, AI-search traffic growing several-hundred % YoY from a small base. **Direction is credible; exact numbers are unverified.** Important caveat for the pitch: AI-referral *clicks* are still a small share of total traffic for most sites — the argument is about *influence on the buyer's shortlist*, which is hard to measure and is precisely what AriClear can't yet show.
- Demand signal: 54% of US marketers say they plan to implement GEO in 3–6 months `[web, single survey via aggregator]`.

### 4.3 Bottom-up sizing `[assumption]` (replace with real data)
| Level | Definition | Math | ARR potential |
|---|---|---|---|
| TAM (reachable) | Websites owned by solo founders + SMB + agencies that care about conversion/AI visibility | ~30M+ active small-business sites globally, of which perhaps 3–5M actively market online | — |
| SAM | English-speaking founders, freelancers and agencies already buying marketing/SEO tools | ~500k–1M buyers | at $150/yr ≈ US$75–150M |
| SOM (24 mo) | Realistic capture for a bootstrapped single-product team | 1,500–3,000 paying × ~$180 blended | **≈ US$270–540k ARR** |

Take this as a hypothesis to test, not a forecast. The point: **this is a healthy bootstrapped / small-fund business, not a venture-scale one, unless AriClear moves up into measurement + agency platform.**

### 4.4 Trends that help
- Agencies are being asked "what are you doing about AI search?" by clients and need something to *show*.
- Founders are used to paying $20–50/mo for narrow AI tools; the low-end of this category already sells at **$20–$100/mo** `[web]`.
- Incumbents (Semrush, Ahrefs, HubSpot) are bundling AI-visibility add-ons `[web]` → category legitimized, but also pushes "free/basic" expectations down.

### 4.5 Trends that hurt
- **Commoditization of "paste URL, get AI critique."** Anyone can do it with one prompt; HubSpot and others offer free graders `[web]`. A pure LLM-opinion product has little defensibility.
- **Measurement is what is being paid for.** Funded players sell *share-of-voice dashboards across ChatGPT/Perplexity/Gemini*. A diagnostic that doesn't measure real model behavior will be seen as a toy by anyone who knows the space.
- **Churn after fix:** a founder fixes the hero once; unless there's monitoring, they cancel.
- **Platform risk:** your inputs (OpenAI/Anthropic/Google) are also your potential competitors.

## 5. Competitive landscape `[web unless noted]`

### 5.1 AI-visibility / GEO tools (the money is here)
| Player | What it sells | Price signal | Position / funding |
|---|---|---|---|
| **Profound** | Enterprise AI-visibility analytics, industry indices | Starter ~$99, Growth ~$399, Enterprise custom (list prices vary by source; up to ~$499 quoted) | Category leader; **US$35M Series B (Sequoia), ~US$58.5M total** |
| **Peec AI** | Prompt-level brand tracking across engines | ~€75 (25 prompts) → €169 (100) → €424+ | Berlin; **~US$29M raised, reported ~US$4M+ ARR in ~10 months** — proof of speed of category |
| **AthenaHQ** | Tracking + optimization for mid-market | ~$295/mo | Well-funded, enterprise-leaning |
| **Goodie AI** | Enterprise GEO | ~$399+ | Named in your own Description as the "enterprise price" foil |
| **Otterly.AI** | Lightweight monitoring | from ~$29/mo (≈15 prompts) | Most accessible; closest on price to AriClear |
| **Rankscale** | Cheap tracking | from ~€20/mo | Price floor |
| **Semrush AI Visibility / Ahrefs Brand Radar / HubSpot AEO** | Bundled in incumbent suites | +$99/mo (Semrush, on top of base plan), from $199/mo (Ahrefs), ~$45–50/mo (HubSpot AEO) + a **free HubSpot AEO Grader** | Distribution advantage; cannibalize the low end |
| Geoptie, others | Named in your Description | — | **Not independently verified here** |

### 5.2 Messaging-clarity / CRO tools
| Player | What it sells | Price signal | Relevance |
|---|---|---|---|
| **Wynter** | Panel-based B2B message testing (Clarity, Relevance, Value, Differentiation) | **~$20–32k/yr** | AriClear is a synthetic, 1/1000th-cost "Wynter-lite." Wynter validates the *concept* and the criteria. |
| **FiveSecondTest** | Real panelists see a 5-sec flash | Pay per test | The literal inspiration; real humans, slow |
| **Hotjar / Microsoft Clarity** | Behavior analytics; Clarity free | Hotjar from ~$39/mo | Different job (behavior, not message) but share the "why isn't my site converting" budget |
| **Unbounce Landing Page Analyzer, LandingScore, similar AI graders** | Free URL graders | Free | Direct competitors for the free tier |
| Generic: ChatGPT/Claude with a prompt | "Critique my homepage" | Free | **The real #1 competitor** |

### 5.3 Where AriClear actually differs `[code + assumption]`
1. **Dual score from one URL** (human + AI) in one report — others do one or the other.
2. **Rewrite output**: headline/subheadline/CTA + a ready-to-paste prompt — action, not a dashboard.
3. **Price/positioning:** serves solo founders; most GEO tools start at $99+ and assume a marketing team.
4. **Brand ↔ website consistency check** (brand-awareness) — rare.
5. **Human expert loop (Ask Ari)** — a service wrapper few tools offer.
6. **Shareable recap video** — novel, potentially viral (unproven).

### 5.4 Where it is weak
- Nothing is defensible if a user can reproduce it with a single prompt. The moat has to be **data, workflow, trust, distribution or brand** — today none is built.
- No measurement of real AI answers; no competitor benchmarking; no integrations; no API.
- Expert sessions are founder time → a services business in a SaaS price page.
- Pricing page promises a lot (uptime monitoring, brand tool, sessions) for $149 while features are manual/unmetered.

### 5.5 Positioning map (qualitative)
```
            MEASURES real AI answers
                     ▲
        Profound ●   │   ● Peec  ● AthenaHQ
                     │      ● Otterly  ● Rankscale
 ENTERPRISE ◄────────┼────────► SOLO / SMB
 PRICE               │                      
        Wynter ●     │   ★ AriClear (today: diagnoses + rewrites, doesn't measure)
                     │   ● free AI graders (HubSpot AEO, Unbounce, LandingScore)
                     ▼
            OPINION only (LLM critique)
```
The **open space** is the lower-right-upper quadrant: *SMB-priced, with real measurement, plus rewrite guidance.* Nobody in the research above clearly owns "cheap + measures + tells you what to write."

## 6. SWOT

| Strengths | Weaknesses |
|---|---|
| Working MVP across 8+ features `[code]` | No billing; no retention loop `[code]` |
| Very low COGS on core scan (<US$0.01) | Score is LLM opinion; non-deterministic; no eval set |
| Clear, honest tone & specific outputs | Feature sprawl (uptime, video, Q&A, brand) dilutes message — ironic for a *clarity* product |
| Founder-friendly price point | Manual expert sessions don't scale |
| Dual-score angle is easy to explain | No visible traction / social proof / case studies on the site |
| | Security gaps (open LLM endpoint, SSRF) = cost & reputation risk |

| Opportunities | Threats |
|---|---|
| Agencies need AI-search audits to sell | Free graders from HubSpot/Unbounce/Semrush |
| Shareable score badge / leaderboard for virality | Funded players moving down-market (Peec/Otterly at $29–75) |
| Real AI-citation measurement at SMB price | LLM vendors adding native "how AI sees your brand" tools |
| Integrations (Webflow, Framer, WordPress, Shopify) | Score-trust backlash if results look random |
| "Clarity" as a recurring KPI with scheduled re-scans | Category hype cooling / GEO tools consolidating |

## 7. Business model & unit economics

### 7.1 Current model `[code]`
| Plan | Page price (yearly / monthly) | Gating in code | Billing |
|---|---|---|---|
| Starter (Free) | $0 | 1 website; "unlimited scans" | — |
| Pro | **$149/yr** ($12.50/mo eq.) / $17 mo | 3 websites | **Lead form only** |
| Expert | **$499/yr** ($41/mo eq.) / $55 mo | 6 websites | **Lead form only** |

`Description.md` (April 2026) says $99/yr and $399–699/yr — inconsistent with the live page.

### 7.1b Pricing decision (implemented on the landing page)
Monthly/yearly toggle removed — it confused buyers. Two plans only:

| Plan | Price | Billing |
|---|---|---|
| Free | $0 | — |
| Pro | **$59 per 6 months** (~$9.83/mo) | One payment every 6 months |

Expert plan removed for now (agencies get a "contact us" path later). Still open: Pro currently lists "3× 30-min expert sessions / month", which at ~$9.83/mo is loss-making founder time (see 7.2). Recommend cutting it to one session per term or making it a paid add-on. Billing is still a lead form until Stripe is wired up.

### 7.2 Observations
- **Annual-first pricing with a monthly toggle is good for cash, bad for conversion** of a product nobody knows yet. A $149 up-front for an unproven scanner is a high-friction ask; consider a monthly default.
- **The price metric is wrong.** You charge by *websites*, but the value for founders is "# of fixes verified" and for agencies is "# of client reports." Agencies need *clients/reports/white-label*, which the plan table doesn't sell at all.
- Bundling "3× / 6× 30-min expert sessions per month" into $12.50/mo means **founder time is worth ~$4/session**. That is a loss-making service. Real price of a 30-min expert call is $50–150.
- The **free tier is too generous** (unlimited scans, PDF) if the demo already gives 2 issues for free — and **too thin** on the thing that converts (seeing all issues and the rewrite). Decide: free = one full scan on one site with score + 2 issues; paid = rewrites, history, re-scan, PDF.
- Expert sessions + video + monitoring on the same page signal "we don't know what this is." Move to add-ons.

### 7.3 Unit economics sketch `[assumption — replace with measured]`
| | Core scan | + video | + expert call |
|---|---|---|---|
| Variable cost | ~$0.002–0.01 | ~$0.10–0.50 | founder time, $50–100 equiv. |
| Healthy at $17/mo? | Yes (>95% GM) | Only with a monthly cap (e.g. 2) | **No** |

Rule: any feature with real variable cost must be **metered or add-on**.

### 7.4 Benchmarks for sanity `[web]`
Otterly from $29/mo, Rankscale ~€20/mo, Peec ~€75/mo, HubSpot AEO ~$45–50/mo. An SMB buyer comparing tools will anchor at **$20–$100/mo**. AriClear at $17–55/mo is in range; $149/yr (~$12.50/mo) is at the very bottom, leaving little room for expansion revenue.

## 8. Go-to-market

### 8.1 Today `[code]`
Landing page + demo scan + waitlist/preorder + plan-request forms + Google Analytics. No blog, no public results pages, no referral loop, no integrations, no case studies visible in code. Part of **Prototype.NEXT** portfolio (cross-promotion opportunity).

### 8.2 Recommended channels (ranked by expected CAC/impact `[assumption]`)

1. **Programmatic "public scorecard" pages (SEO + virality).** Every scan of a *public* site can generate `ariclear.com/score/<domain>` with the score, 2 issues and a CTA "Claim and fix this." People search their own domain name and competitors'. Add `noindex` for opt-outs. Also a **badge** ("Clarity 82 · AI-ready 74") for founders to embed — backlink + proof loop.
2. **Product-led virality via the recap video.** The 15-second "visitor confused → leaves" video is inherently shareable on X/LinkedIn/TikTok. Make the free scan produce a **watermarked** one; paid removes the watermark. This is the justification for keeping the video feature.
3. **Public roast / build-in-public.** Weekly "I scanned 20 YC/Product Hunt launches — the average clarity score was X" threads. Data-led content is the cheapest credible acquisition in this category and the dataset becomes a moat (benchmark by industry).
4. **Agency channel.** Partner with 20–50 freelancers/small SEO agencies: free Expert plan for a case study + referral rev share (20–30% recurring). White-label PDF is the product; the agency's clients are the distribution.
5. **Communities and directories.** Product Hunt, Indie Hackers, r/SaaS, r/SEO, Hacker News "Show HN," AI-tool directories, Webflow/Framer/Shopify communities, "AI SEO" newsletters.
6. **Integrations as acquisition:** Webflow/Framer/WordPress plugin "scan this page" inside the editor.
7. **Paid:** not yet; only after >3% free→paid and payback <6 months.

### 8.3 Funnel to instrument (TO FILL — currently unmeasured)
`Visit → demo scan → email/sign-up → full scan → saved scan → 2nd scan within 14 days → paid → 3-month retention`
Only GA exists. Add events (PostHog) and a weekly funnel review.

## 9. Diagnosis — why it may not be growing and what is wrong with the business (most to least important)

1. **No revenue mechanism.** Without Stripe nothing else matters.
2. **No retention mechanism.** One-time use → churn. Scheduled re-scans + score trend + alerts are the subscription.
3. **Undefined buyer.** The pricing page tries to serve founders, agencies and "teams" with one feature table. Pick the *wedge* (recommend: agencies/freelancers for revenue, founders for acquisition) and write page and pricing for each.
4. **Feature sprawl.** Uptime monitor, brand tool, video, Q&A board and expert calls are five products. Each splits attention and QA. For a company whose promise is *clarity*, the site must answer what/who/what-next in 5 seconds — **run AriClear on ariclear.com first and publish the result.**
5. **Credibility gap vs. the category.** No real AI measurement, no social proof, no methodology page, no sample report. Visitors from the GEO space will bounce.
6. **Score trust.** Variance between runs and JS-rendered sites scoring wrong (tech doc §7 #15) can generate public "your tool gave me a 22 for a great site" posts. Highest brand risk.
7. **Open endpoints** can create a surprise bill or abuse incident (tech doc §7).
8. **Docs/pricing inconsistencies** (README ≠ code ≠ Description ≠ pricing page) suggest the strategy is still moving — settle it in writing here.

## 10. Strategy: what to build and sell

### 10.1 Positioning (draft — test it)
> **"See your website the way a stranger — and an AI — sees it. Then fix it in 10 minutes."**
Category: *Website clarity & AI-readiness*, **not** "GEO analytics." Avoid fighting Profound/Peec on their field until you can measure; claim the adjacent, under-served job ("fix your message + make it machine-readable").

### 10.2 Product focus (kill / keep / build)
| Decision | Item | Reason |
|---|---|---|
| **Keep & sharpen** | Dual score, rewrite, action plan, history, PDF | The product |
| **Keep as growth engine** | Recap video (watermarked, capped) | Virality; cheap if capped |
| **Make it real** | Scheduled re-scans, email digest, score badge, public scorecard pages | Retention + acquisition |
| **Build next (moat)** | **AI visibility check**: run 10–20 buyer-intent prompts against ChatGPT/Perplexity/Gemini/Claude APIs for the business category and report "mentioned / cited / competitors named" | Credibility; what the market pays for |
| **Build next (revenue)** | White-label agency reports + multi-client dashboard | Highest-ARPU segment |
| **Demote to add-on / pause** | Uptime monitor (commodity; free alternatives), Ask-Ari live sessions (unscalable) | Distraction |
| **Reprice** | Expert sessions → paid add-on ($49–99 each) or an agency "review" product | Don't subsidize founder time |

### 10.3 Pricing proposal `[assumption — A/B test]`
| Plan | Price | For | Includes |
|---|---|---|---|
| **Free** | $0 | Everyone | 3 scans/mo, 1 site, scores + 2 issues, watermarked score badge |
| **Founder** | **$19/mo** ($149/yr) | Solo founders | 3 sites, full rewrites, history & trend, weekly auto re-scan, PDF, 2 recap videos/mo |
| **Studio / Agency** | **$79–99/mo** ($799/yr) | Freelancers, small agencies | 15 client sites, **white-label PDF**, bulk scans, client share links, AI-visibility check (limited prompts) |
| **Agency+** | $199+/mo | Growing agencies | 50 sites, team seats, API, priority support |
| Add-ons | $49–99 | Anyone | 30-min expert review; extra videos; extra prompts for AI-visibility |

Rationale: moves the price to where the funded competitors anchor, aligns the metric to client sites/reports, makes services an add-on, and keeps the founder tier cheap enough for impulse purchase. Target blended ARPU ≈ $25–35/mo.

### 10.4 Moat building (ordered by feasibility)
1. **Benchmark dataset:** every scan (with consent) feeds industry/segment benchmarks → "you scored 41; median SaaS homepage is 52." Increases in value with each scan; competitors can't copy the data.
2. **Workflow lock-in:** history, trend, white-label client portfolio, scheduled reports.
3. **Distribution assets:** public scorecards (SEO), badges (backlinks), videos (social).
4. **Methodology brand:** publish the scoring rubric + eval results ("how we score"). Trust is the product.
5. **Integrations** in editors/CMS.

## 11. Roadmap with success metrics

| Horizon | Goal | Deliverables | Metric / exit criterion |
|---|---|---|---|
| **0–2 wks** | Make it safe & chargeable | SSRF/rate-limit fixes, Stripe Checkout + webhook, tier entitlements, pricing page aligned with code | First test payment end-to-end; $0 unexpected LLM spend |
| **2–6 wks** | Prove value & retention | Scheduled re-scan + email, score trend, deterministic checks + eval set, JS rendering, public scorecard + badge, run AriClear on itself and fix homepage | Re-scan within 14d ≥ 25% of signups; score variance ≤ ±3 on same URL |
| **6–12 wks** | Prove willingness to pay | Launch (Product Hunt/IH/HN), 20 agency pilots, watermark video, benchmark post | **≥ 30 paying customers**, free→paid ≥ 3%, ≥ 5 agency logos |
| **3–6 mo** | Differentiate | AI-visibility check; white-label + multi-client; Webflow/WordPress plugin | ARPU ≥ $30; agency share ≥ 40% of revenue; churn ≤ 6%/mo |
| **6–12 mo** | Scale | API, team seats, partnerships, evaluate raising or acquiring | MRR $10–20k; decide: stay bootstrapped vs. seed |

**North-star metric:** *weekly active sites re-scanned* (a proxy for ongoing value). **Guardrails:** cost per scan, score variance, support load.

## 12. Experiments to run first (cheap, 1–2 weeks each)

| # | Hypothesis | Test | Win condition |
|---|---|---|---|
| 1 | People will pay if checkout exists | Stripe Payment Links on the current pricing page, monthly default | ≥ 2% of full-scan users click, ≥ 5 paid in 14 days |
| 2 | Agencies value white-label more than founders value anything | Email the waitlist/`plan_requests` list (`[code]`: it already stores email, plan, # sites, notes) with an agency offer; 10 calls | ≥ 3 agencies commit to a paid pilot |
| 3 | Public scorecards produce organic traffic | Publish 500 scorecards for top Product Hunt/YC domains | Indexed pages + ≥ 1k organic visits/month in 8 weeks |
| 4 | Video drives shares | Watermarked video on every free scan with a one-click "post" | ≥ 5% of scans shared; measurable referral traffic |
| 5 | "Brutal honesty" is a draw, not a deterrent | Headline test: "Your homepage is probably a 38. Find out." vs current | Higher demo-scan start rate |
| 6 | Real AI-visibility data lifts conversion | Prototype 10-prompt check for 50 users, in the report | Higher scan→paid and NPS vs control |
| 7 | Annual-first suppresses conversion | Monthly default vs annual default | Higher paid conversion at equal or better LTV |

Mine **`plan_requests` and `mailcollection`** now: they are the only demand data you own. **TO FILL:** count, by plan and by # websites requested.

## 13. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Free AI graders make the core scan a commodity | High | High | Build measurement, benchmarks, workflow, agency features — don't compete on the single scan |
| Score inconsistency/inaccuracy damages trust | High | High | Deterministic anchors, eval set, rendered fetch, publish methodology, show confidence |
| Open endpoints → cost spike / abuse | Medium | Medium–High | Fix per tech doc §7 immediately |
| Video COGS erode margin | Medium | Medium | Cap per plan, watermark on free, move to async worker |
| Services (expert sessions) don't scale | High | Medium | Price as add-on; productize as "review" |
| Funded players move down-market | Medium | High | Own agencies + price/ease + brand-consistency angle; speed |
| LLM vendors ship native equivalent | Medium | High | Multi-model, data moat, workflow ownership |
| Category hype fades | Medium | Medium | Value must stand on *conversion clarity*, not on "AI" alone |
| Founder bandwidth (portfolio studio) | Medium | High | Say no to features; one-metric focus |
| Legal/ToS: scraping, storing third-party site content, GDPR for EU users | Low–Medium | Medium | Respect robots/opt-out, privacy policy, DPA for agencies, `noindex` option on scorecards |

## 14. Open questions to answer with data (TO FILL)

1. How many signups, scans, paid intents? Where do they come from? (GA + Supabase `scans`, `user_subscriptions`, `plan_requests`, `mailcollection`)
2. Which segment is asking for Pro/Expert, and what do they write in `notes`?
3. What is the rerun-variance of the score on 30 sample URLs?
4. Does the video pipeline run in production, and at what cost per video?
5. Who is the first-choice 10 agencies?
6. What will the company be in 12 months: a lifestyle SaaS (≈$300k–$1M ARR), an agency tool, or a venture bet on GEO? That determines hiring and funding choices.

## 15. Sources (web research, retrieved Oct 2026)

Market size / adoption (aggregators; treat as directional):
- [GEO Market Size and Statistics 2026 — Superlines](https://www.superlines.io/articles/geo-market-size-statistics/)
- [Generative Engine Optimization Market Size — Dimension Market Research](https://dimensionmarketresearch.com/report/generative-engine-optimization-geo-market/)
- [GEO Platform Market — Coherent Market Insights](https://www.coherentmarketinsights.com/industry-reports/generative-engine-optimization-geo-platform-market)
- [GEO Services Market — Coherent Market Insights](https://www.coherentmarketinsights.com/industry-reports/generative-engine-optimization-geo-services-market)
- [AI Search Statistics 2026 — Superlines](https://www.superlines.io/articles/ai-search-statistics/)
- [The State of GEO in Q1 2026 — Superlines](https://www.superlines.io/articles/the-state-of-geo-in-q1-2026)
- [The State of AI Search in 2026 — Deepak Gupta](https://guptadeepak.com/state-of-ai-search-2026-statistics/)

Competitors & pricing:
- [AI visibility tool pricing — Rankability](https://www.rankability.com/blog/how-much-should-you-pay-for-ai-search-visibility-tracking-tools/)
- [Best AI Visibility Tools 2026 — Surmado](https://www.surmado.com/blog/best-ai-visibility-tools-2026)
- [AI visibility trackers compared — SquirrelScan](https://squirrelscan.com/learn/ai-visibility-trackers)
- [Profound raises $35M Series B led by Sequoia — Fortune](https://dc.fortune.com/2025/08/12/ai-search-startup-profound-raises-35-million-series-b-sequoia/)
- [Profound vs Peec AI — Airefs](https://getairefs.com/blog/profound-vs-peec-ai/)
- [Best AEO software — HubSpot](https://www.hubspot.com/products/aeo/best-aeo-software)
- [Wynter pricing — PricingSaaS](https://pricingsaas.com/companies/wynter)
- [Wynter message testing guide](https://wynter.com/post/message-testing)
- [Hotjar vs Microsoft Clarity](https://www.joinsecret.com/compare/hotjar-vs-microsoft-clarity)
- [LandingScore alternatives — AlternativeTo](https://alternativeto.net/software/landingscore)

Caveats: prices change frequently and vary by source; funding/ARR figures for Peec come from third-party summaries; Geoptie (named in `Description.md`) was not verified. Re-check anything you quote publicly.
