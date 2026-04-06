/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

type PlatformData = {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
};

type RequestData = {
  businessName: string;
  businessDescription: string;
  targetAudience: string;
  websiteUrl?: string;
  platforms: PlatformData;
};

type ScoreRating = "Excellent" | "Good" | "Needs Work" | "Critical";

type MetricAnalysis = {
  score: number;
  rating: ScoreRating;
  summary: string;
  insights: string[];
  recommendations: string;
  redFlags: string[];
};

type HumanReadabilityAnalysis = {
  score: number;
  rating: ScoreRating;
  fiveSecondTest: string;
  fifthGraderTest: string;
  jargonDetected: string[];
  valuePropositionClarity: string;
  emotionalResonance: string;
  summary: string;
  recommendations: string;
};

type AIReadabilityAnalysis = {
  score: number;
  rating: ScoreRating;
  entityExtraction: {
    businessCategory: string | null;
    targetCustomer: string | null;
    coreService: string | null;
    differentiator: string | null;
    location: string | null;
    priceSignal: string | null;
  };
  structuredDataReadiness: string;
  searchIntentAlignment: string;
  llmIndexability: string;
  summary: string;
  recommendations: string;
};

type WebsiteMatchAnalysis = {
  score: number;
  rating: ScoreRating;
  websiteScraped: boolean;
  heroMessageMatch: string;       // Does website hero copy match the brand description?
  audienceSignalMatch: string;    // Does website speak to the stated target audience?
  brandVoiceConsistency: string;  // Is the voice/tone on the site consistent with brand claim?
  missingOnWebsite: string[];     // Things claimed in description but absent from the site
  websiteRedFlags: string[];      // Specific things on the site that contradict or weaken the brand
  summary: string;
  recommendations: string;
};

type AnalysisReport = {
  overallScore: number;
  severityLevel: "Critical" | "Weak" | "Average" | "Strong" | "Excellent";
  executiveSummary: string;
  brandClarity: MetricAnalysis;
  engagementQuality: MetricAnalysis;
  contentConsistency: MetricAnalysis;
  humanReadability: HumanReadabilityAnalysis;
  aiReadability: AIReadabilityAnalysis;
  websiteMatch: WebsiteMatchAnalysis;
  platformSpecific: Record<string, string>;
  topThreeKillers: string[];
  quickWins: string[];
};

// ─── Website Scraper ──────────────────────────────────────────────────────────

async function scrapeWebsite(url: string): Promise<string | null> {
  try {
    // Normalize URL
    const normalized = url.startsWith("http") ? url : `https://${url}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(normalized, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AriClear-BrandBot/1.0; +https://ariclear.com)",
        Accept: "text/html",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();

    // Extract meaningful text — title, meta description, h1-h3, hero-ish paragraphs
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
    const metaDesc =
      html
        .match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
        ?.[1]
        ?.trim() ?? "";
    const ogDesc =
      html
        .match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
        ?.[1]
        ?.trim() ?? "";

    // Strip scripts, styles, nav, footer, SVG
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Take the first 3000 chars of visible text — enough for hero + above fold
    const visibleText = stripped.slice(0, 3000);

    return [
      title ? `PAGE TITLE: ${title}` : "",
      metaDesc ? `META DESCRIPTION: ${metaDesc}` : "",
      ogDesc && ogDesc !== metaDesc ? `OG DESCRIPTION: ${ogDesc}` : "",
      `VISIBLE TEXT (above fold):\n${visibleText}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  } catch {
    return null;
  }
}

// ─── Shape Validator ──────────────────────────────────────────────────────────

function isReportShape(obj: any): obj is AnalysisReport {
  if (!obj || typeof obj !== "object") return false;

  const hasMetric = (o: any, key: string) =>
    o[key] &&
    typeof o[key].score === "number" &&
    typeof o[key].rating === "string" &&
    typeof o[key].summary === "string";

  return (
    typeof obj.overallScore === "number" &&
    typeof obj.severityLevel === "string" &&
    typeof obj.executiveSummary === "string" &&
    hasMetric(obj, "brandClarity") &&
    Array.isArray(obj.brandClarity.insights) &&
    Array.isArray(obj.brandClarity.redFlags) &&
    hasMetric(obj, "engagementQuality") &&
    Array.isArray(obj.engagementQuality.insights) &&
    Array.isArray(obj.engagementQuality.redFlags) &&
    hasMetric(obj, "contentConsistency") &&
    Array.isArray(obj.contentConsistency.insights) &&
    Array.isArray(obj.contentConsistency.redFlags) &&
    obj.humanReadability &&
    typeof obj.humanReadability.score === "number" &&
    typeof obj.humanReadability.fiveSecondTest === "string" &&
    Array.isArray(obj.humanReadability.jargonDetected) &&
    obj.aiReadability &&
    typeof obj.aiReadability.score === "number" &&
    obj.aiReadability.entityExtraction &&
    obj.websiteMatch &&
    typeof obj.websiteMatch.score === "number" &&
    typeof obj.websiteMatch.websiteScraped === "boolean" &&
    Array.isArray(obj.websiteMatch.missingOnWebsite) &&
    Array.isArray(obj.websiteMatch.websiteRedFlags) &&
    obj.platformSpecific &&
    typeof obj.platformSpecific === "object" &&
    Array.isArray(obj.topThreeKillers) &&
    obj.topThreeKillers.length === 3 &&
    Array.isArray(obj.quickWins) &&
    obj.quickWins.length === 3
  );
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  businessName: string,
  businessDescription: string,
  targetAudience: string,
  platformList: string,
  websiteContent: string | null,
  websiteUrl: string | undefined
): string {
  const websiteSection = websiteContent
    ? `
═══════════════════════════════════════════════════════
WEBSITE CONTENT (scraped from ${websiteUrl})
═══════════════════════════════════════════════════════
${websiteContent}

CRITICAL: Cross-reference everything in the brand description against this actual website content.
If the website says something different from the description — that IS a red flag.
If claims in the description don't appear anywhere on the site — that IS a gap.
`
    : websiteUrl
    ? `
═══════════════════════════════════════════════════════
WEBSITE: ${websiteUrl} (could not be scraped — inaccessible or timed out)
═══════════════════════════════════════════════════════
Set websiteMatch.websiteScraped = false and note the site was unreachable.
`
    : `
═══════════════════════════════════════════════════════
WEBSITE: None provided
═══════════════════════════════════════════════════════
Set websiteMatch.websiteScraped = false. Note the absence of a website as a significant gap.
`;

  return `
You are AriClear's core brand analysis engine — the most rigorous, unsparing brand evaluation system available to small businesses and founders. Your entire value comes from being HONEST, SPECIFIC, and BRUTALLY ACCURATE. Inflated scores destroy trust and harm the user.

AriClear helps founders and small businesses understand if their brand is clear to real humans AND to AI systems. You are their main feature. Every score you give will be shown directly to a paying user. Make it count.

═══════════════════════════════════════════════════════
BUSINESS BEING ANALYZED
═══════════════════════════════════════════════════════
Name: ${businessName}
Description: ${businessDescription}
Target Audience: ${targetAudience}
Active Platforms: ${platformList}
${websiteSection}

═══════════════════════════════════════════════════════
SCORING PHILOSOPHY — INTERNALIZE THIS COMPLETELY
═══════════════════════════════════════════════════════

Reality check: 80% of small businesses score below 55. A 70+ score should feel hard to earn.
Do NOT give comfort scores. Low scores with specific feedback are MORE valuable than high scores.

SCORE BANDS:
• 0–39   → Critical: Actively confusing or invisible. Full rethink needed.
• 40–54  → Weak: Significant gaps. Blends into noise.
• 55–69  → Average: Some structure, missing differentiation.
• 70–79  → Good: Solid but notable gaps remain.
• 80–89  → Strong: Clear, differentiated, strategically coherent.
• 90–100 → Excellent: Rare. Reserved for exceptional brands.

DEDUCT POINTS AGGRESSIVELY FOR:
- Generic language: "innovative", "seamless", "passionate", "solutions", "leverage",
  "world-class", "cutting-edge", "empower", "transform", "holistic", "dynamic", "synergy"
- Missing WHO / WHAT / WHY in the value proposition
- No concrete differentiator — if it could describe 100 competitors, deduct heavily
- Vague or overly broad target audience
- Website content that contradicts or ignores what's in the description
- Platform presence without strategic intent
- Description that reads like a mission statement, not a value proposition

═══════════════════════════════════════════════════════
METRICS TO EVALUATE (6 total)
═══════════════════════════════════════════════════════

1. BRAND CLARITY
   5-second rule: Would someone IMMEDIATELY understand what this is, for whom, and why it matters?
   Deduct if: description is generic, value prop buried, name gives no category signal,
   no "instead of X" positioning, relies on jargon.

2. ENGAGEMENT QUALITY  
   Would the target audience ACTUALLY stop and care?
   Deduct if: no emotional hook, brand feels corporate when it should be human (or vice versa),
   nothing memorable, audience too broad, tone mismatch, no specific pain point addressed.

3. CONTENT CONSISTENCY
   Is there a coherent brand strategy visible?
   Deduct if: scattered platform presence, no consistent POV or voice, platform choices
   don't match where the audience actually is, mixed signals across name/description/platforms.

4. HUMAN READABILITY
   Can a DISTRACTED, SKEPTICAL human quickly understand and trust this brand?
   Run these tests:
   a) 5-Second Test — what does a person grasp in 5 seconds? What stays confusing?
   b) 5th Grader Test — could a 10-year-old explain this to their parents?
   c) Jargon Scan — list every buzzword or vague corporate phrase
   d) Value Prop Clarity — is the BENEFIT (not feature) instantly clear?
   e) Emotional Resonance — does this evoke curiosity, relief, excitement, or recognition?

5. AI READABILITY
   Can AI systems (LLMs, search engines, Perplexity, voice assistants) accurately parse this brand?
   Extract: business category, target customer, core service, differentiator, location, price signal.
   Evaluate: structured data readiness, search intent alignment, LLM indexability.

6. WEBSITE MATCH (if website was provided/scraped)
   Does the ACTUAL website match what the brand claims to be?
   This is where most brands fail silently.
   
   Cross-reference ruthlessly:
   - Does the hero message actually communicate the stated value proposition?
   - Does the site speak to the stated target audience by language, tone, examples?
   - Are the claims in the description actually present on the website?
   - Is there anything on the website that CONTRADICTS or WEAKENS the brand claim?
   - What's MISSING from the site that a first-time visitor would need to trust the brand?
   
   If no website was provided: score = 20, note it as a major gap. Having no website
   in 2025 is a significant brand signal on its own.
   If website couldn't be scraped: score = 30, note the accessibility issue.

═══════════════════════════════════════════════════════
OUTPUT FORMAT — STRICT JSON ONLY
═══════════════════════════════════════════════════════

Return ONLY valid JSON. No markdown, no backticks, no preamble.

{
  "overallScore": number (0-100, weighted average across all 6 metrics — websiteMatch counts fully),
  "severityLevel": "Critical" | "Weak" | "Average" | "Strong" | "Excellent",
  "executiveSummary": "3-4 sentences. Lead with the single biggest problem. Be specific. End with the core shift needed.",

  "brandClarity": {
    "score": number,
    "rating": "Excellent" | "Good" | "Needs Work" | "Critical",
    "summary": "2-3 honest sentences. Quote specific vague phrases found.",
    "insights": ["specific confusion point", "specific value prop gap", "specific missing info a customer needs"],
    "recommendations": "2-3 sentences with SPECIFIC rewrites, not generic advice.",
    "redFlags": ["specific phrase or gap actively hurting clarity"]
  },

  "engagementQuality": {
    "score": number,
    "rating": "Excellent" | "Good" | "Needs Work" | "Critical",
    "summary": "2-3 honest sentences on differentiation and audience fit.",
    "insights": ["why audience scrolls past", "competitor advantage being left on table", "missing hook"],
    "recommendations": "2-3 SPECIFIC engagement improvements.",
    "redFlags": ["specific things that repel the target audience"]
  },

  "contentConsistency": {
    "score": number,
    "rating": "Excellent" | "Good" | "Needs Work" | "Critical",
    "summary": "2-3 honest sentences on strategic coherence.",
    "insights": ["specific strategic gap", "what makes content feel random", "platform-strategy mismatch"],
    "recommendations": "2-3 SPECIFIC strategic direction sentences.",
    "redFlags": ["specific consistency risks"]
  },

  "humanReadability": {
    "score": number,
    "rating": "Excellent" | "Good" | "Needs Work" | "Critical",
    "fiveSecondTest": "What a person understands in 5 seconds and what stays unclear.",
    "fifthGraderTest": "What a 10-year-old would say this business does, or why they couldn't explain it.",
    "jargonDetected": ["every buzzword and vague corporate phrase found"],
    "valuePropositionClarity": "Is the benefit (not feature) clear to a first-time visitor? Explain specifically.",
    "emotionalResonance": "Does this evoke any emotion or recognition in the target audience? What's missing?",
    "summary": "2-3 sentences on human comprehension failures.",
    "recommendations": "SPECIFIC fixes to make this legible to a distracted human."
  },

  "aiReadability": {
    "score": number,
    "rating": "Excellent" | "Good" | "Needs Work" | "Critical",
    "entityExtraction": {
      "businessCategory": "exact category string or null",
      "targetCustomer": "specific customer description or null",
      "coreService": "exact service/product or null",
      "differentiator": "unique extractable claim or null",
      "location": "location if relevant or null",
      "priceSignal": "Budget / Mid-range / Premium / Unknown"
    },
    "structuredDataReadiness": "Can an AI parse this cleanly? What would it fail on?",
    "searchIntentAlignment": "Does brand language match actual search queries? What terms are missing?",
    "llmIndexability": "How would an AI assistant describe this brand if asked to recommend it? Would it be skipped?",
    "summary": "2-3 sentences on AI/machine readability failures.",
    "recommendations": "SPECIFIC fixes to improve AI discoverability."
  },

  "websiteMatch": {
    "score": number,
    "rating": "Excellent" | "Good" | "Needs Work" | "Critical",
    "websiteScraped": boolean,
    "heroMessageMatch": "Does the website hero/above-fold content match the stated brand description? Quote actual website text found or missing.",
    "audienceSignalMatch": "Does the website visibly speak to the stated target audience? Cite specific evidence or gaps.",
    "brandVoiceConsistency": "Is the website tone/voice consistent with the brand description? Flag any mismatch.",
    "missingOnWebsite": ["claim from description absent from website", "another gap"],
    "websiteRedFlags": ["specific on-site issue that contradicts or weakens brand claim"],
    "summary": "2-3 sentences. Be specific — quote website text when possible.",
    "recommendations": "SPECIFIC website fixes to close the gap between claimed brand and live brand."
  },

  "platformSpecific": {
    "platformName": "The single biggest risk or mistake for THIS business on THIS specific platform."
  },

  "topThreeKillers": [
    "The #1 thing actively costing this brand customers right now (be specific)",
    "The #2 structural problem preventing growth",
    "The #3 gap competitors will exploit"
  ],

  "quickWins": [
    "Highest-ROI fix doable today — be specific about what to change and to what",
    "Second fastest improvement with exact instructions",
    "Third quick win with expected impact"
  ]
}

ABSOLUTE RULES:
1. Zero generic advice. Every sentence must reference THIS specific business.
2. Quote their actual description or website text when calling something out.
3. Null values in entityExtraction are honest — use them when nothing is extractable.
4. topThreeKillers and quickWins must have EXACTLY 3 items each.
5. websiteMatch.websiteScraped = true only if you actually received scraped content above.
6. Lower scores are more useful than comfortable ones.
7. If the description is copy-paste generic, say so by name.
8. The overall score must honestly reflect all 6 metrics including websiteMatch.
`.trim();
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as RequestData;
    const { businessName, businessDescription, targetAudience, websiteUrl, platforms } = data;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!businessName?.trim() || !businessDescription?.trim() || !targetAudience?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: businessName, businessDescription, and targetAudience are required." },
        { status: 400 }
      );
    }

    if (businessDescription.trim().length < 30) {
      return NextResponse.json(
        {
          error: "Business description is too short. Provide at least 30 characters for a meaningful analysis.",
          errorCode: "DESCRIPTION_TOO_SHORT",
        },
        { status: 400 }
      );
    }

    if (businessDescription.trim().length > 2000) {
      return NextResponse.json(
        {
          error: "Business description is too long. Please limit to 2000 characters.",
          errorCode: "DESCRIPTION_TOO_LONG",
        },
        { status: 400 }
      );
    }

    console.log("🔍 AriClear brand analysis starting for:", businessName);

    // ── Platforms ───────────────────────────────────────────────────────────
    const activePlatforms = Object.entries(platforms).filter(
      ([, value]) => value && value.trim() !== ""
    );

    const platformList = activePlatforms.length
      ? activePlatforms.map(([key]) => key).join(", ")
      : "No platforms provided";

    // ── Website Scrape ──────────────────────────────────────────────────────
    let websiteContent: string | null = null;
    if (websiteUrl?.trim()) {
      console.log("🌐 Scraping website:", websiteUrl);
      websiteContent = await scrapeWebsite(websiteUrl.trim());
      console.log(websiteContent ? "✅ Website scraped successfully" : "⚠️ Website scrape failed");
    }

    // ── Claude API Call ─────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(
      businessName,
      businessDescription,
      targetAudience,
      platformList,
      websiteContent,
      websiteUrl?.trim()
    );

    const userMessage = JSON.stringify(
      {
        businessName,
        businessDescription,
        targetAudience,
        websiteUrl: websiteUrl?.trim() || null,
        websiteScrapedSuccessfully: !!websiteContent,
        activePlatforms: activePlatforms.map(([platform, handle]) => ({ platform, handle })),
      },
      null,
      2
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    console.log("✅ Claude response received");

    // ── Extract Text ────────────────────────────────────────────────────────
    const outputText = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("")
      .trim();

    if (!outputText) {
      return NextResponse.json({ error: "Empty response from analysis engine." }, { status: 500 });
    }

    // ── Parse JSON ──────────────────────────────────────────────────────────
    let report: any;
    try {
      const cleaned = outputText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      report = JSON.parse(cleaned);
    } catch {
      console.error("Invalid JSON from analysis engine:", outputText.slice(0, 500));
      return NextResponse.json(
        { error: "Analysis engine returned malformed data. Please try again." },
        { status: 500 }
      );
    }

    // ── Validate Shape ──────────────────────────────────────────────────────
    if (!isReportShape(report)) {
      console.error("Unexpected report shape:", JSON.stringify(report).slice(0, 500));
      return NextResponse.json(
        { error: "Analysis returned an unexpected format. Please try again." },
        { status: 500 }
      );
    }

    // ── Score Sanity Check ──────────────────────────────────────────────────
    const componentScores = [
      report.brandClarity.score,
      report.engagementQuality.score,
      report.contentConsistency.score,
      report.humanReadability.score,
      report.aiReadability.score,
      report.websiteMatch.score,
    ];
    const computedAverage = Math.round(
      componentScores.reduce((a, b) => a + b, 0) / componentScores.length
    );
    if (Math.abs(report.overallScore - computedAverage) > 5) {
      report.overallScore = computedAverage;
    }

    // ── Severity Consistency ────────────────────────────────────────────────
    const score = report.overallScore;
    report.severityLevel =
      score >= 90 ? "Excellent" :
      score >= 80 ? "Strong" :
      score >= 70 ? "Average" :
      score >= 55 ? "Weak" :
      "Critical";

    console.log(`🎉 Analysis complete — ${businessName}: ${report.overallScore}/100 (${report.severityLevel})`);

    return NextResponse.json(report);

  } catch (err: any) {
    console.error("❌ Brand analysis error:", err);

    if (err?.status === 429 || err?.error?.type === "rate_limit_error") {
      return NextResponse.json(
        { error: "Analysis engine is temporarily busy. Please wait a moment and try again.", errorCode: "RATE_LIMITED", rateLimited: true },
        { status: 429 }
      );
    }
    if (err?.status === 401 || err?.error?.type === "authentication_error") {
      return NextResponse.json(
        { error: "Analysis service configuration error. Please contact support.", errorCode: "AUTH_ERROR" },
        { status: 500 }
      );
    }
    if (err?.status === 529 || err?.error?.type === "overloaded_error") {
      return NextResponse.json(
        { error: "Analysis engine is overloaded. Please try again in a few seconds.", errorCode: "OVERLOADED", retryable: true },
        { status: 503 }
      );
    }
    if (err?.status) {
      return NextResponse.json(
        { error: `Analysis service error (${err.status}): ${err.message ?? "Unknown error"}`, errorCode: "API_ERROR" },
        { status: err.status }
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while analyzing brand awareness. Please try again.", errorCode: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}