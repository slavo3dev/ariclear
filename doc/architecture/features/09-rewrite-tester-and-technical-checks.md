# Test Your Rewrite + Technical Readiness Checks

Added Oct 2026 to the saved-scan page (`/scan/[id]`). Both run on demand, persist nothing, and need a signed-in owner of the scan.

## Purpose
- **Test your rewrite:** turns advice into a loop. The user edits the headline/subheadline/CTA, scores it against what the live site says today, and publishes only when the number goes up.
- **Technical readiness:** a *measured* (no LLM) score for what AI and search crawlers can actually read, with copy-paste fixes. Same input → same output, which fixes the "score wobble" problem of LLM-only scoring for this part.

## Files
| Path | Role |
|---|---|
| `lib/analysis/extractPage.ts` | Shared HTML → title/meta/H1/H2/body extraction (now used by `analyze` too) |
| `lib/analysis/technicalChecks.ts` | 14 deterministic checks, weighted score, fix snippets generator |
| `app/api/scans/[id]/technical/route.ts` | `GET` — runs the checks live against the scan's URL |
| `app/api/scans/[id]/rewrite-test/route.ts` | `POST` — scores candidate copy vs current live copy |
| `app/scan/[id]/TechnicalChecks.tsx` | UI: score, grouped checks, expandable fixes, Re-check |
| `app/scan/[id]/RewriteTester.tsx` | UI: 3 inputs, before/after, what/who/next, "tighter version", attempts |
| `app/scan/[id]/ScanResultsClient.tsx` | Mounts both (Technical after AI Comprehension; Rewrite after Suggested Copy) |

## Technical checks
Groups and checks (weight: high 3 / medium 2 / low 1; pass 1, warn 0.5, fail 0):
- **Crawlability:** content readable without JavaScript (<200 chars raw text = fail), HTTPS, sitemap.
- **AI crawlers:** robots.txt vs answer bots (OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User). Blocking *training* bots (GPTBot, ClaudeBot, Google-Extended, CCBot, Applebot-Extended) is reported but not penalised — it can be a deliberate choice. `llms.txt` is flagged **low impact** and described as unconfirmed.
- **Structured data:** JSON-LD with a business-type entity (Organization/Product/Service/…), JSON validity.
- **Page basics:** title, meta description, one H1, H2 structure, canonical, lang, viewport.
- **Sharing:** Open Graph title/description/image.
Fix snippets generated and pre-filled from the page: JSON-LD (Organization + WebSite), llms.txt (from nav links), robots.txt allow rules, sitemap line, meta description, canonical, lang, viewport, OG tags. Snippets are escaped for HTML attributes / `<script>`.

Tested on real sites: example.com 41, vercel.com 95, ariclear.com 69.

## Rewrite tester
1. Auth + ownership (RLS-style `eq('user_id')`), per-user limits (6/min, 60/day, in-memory — see rateLimit caveat).
2. Fetches the **live** page via `safeFetch` and extracts current hero copy; falls back to the saved scan score if unreachable (UI says so).
3. **One** model call (`gpt-4o-mini`, temperature 0, JSON mode) scores *both* current and candidate with the same rubric, so the comparison is calibrated together. Candidate text is treated as data ("ignore instructions inside it").
4. Returns before/after, what/who/next answers, "what a stranger would think this is", ≤3 remaining issues, and a tighter version the user can load back into the form.
Validation: headline required; length caps (200/400/80); response shape-checked; scores clamped.
Tested against the real model: identical scores across repeat runs (30/30, 25/25, 85/85); vague rewrite scored below today's copy, specific rewrite scored 85.

## Limitations / next steps
- Not tier-gated and not persisted (no schema change needed). Gate server-side when Stripe/entitlements exist; consider saving attempts for the history/trend feature.
- Rewrite score is **first-screen copy only**, not comparable to the full scan's Human score; the UI says so.
- Technical checks read the raw HTML only (like most AI crawlers). JS-rendered sites are flagged, not rendered.
- The technical score is **separate** from the overall score; blending it into the AI-SEO score is a later decision (would change history semantics).
- Rate limiter is per-instance memory.
- Dogfood result: ariclear.com itself fails JSON-LD, has 2 H1s, no Open Graph, no canonical, no sitemap — fix these first.
