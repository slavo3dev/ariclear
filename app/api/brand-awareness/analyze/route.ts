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
  fiveSecondTest: string;        // Would a distracted human "get it" in 5 seconds?
  fifthGraderTest: string;       // Can a 5th grader explain what this business does?
  jargonDetected: string[];      // Specific buzzwords/jargon found
  valuePropositionClarity: string; // Is the core "why you" clear to a human?
  emotionalResonance: string;    // Does it make a human FEEL something or care?
  summary: string;
  recommendations: string;
};

type AIReadabilityAnalysis = {
  score: number;
  rating: ScoreRating;
  entityExtraction: {
    businessCategory: string | null;    // Can AI determine the category?
    targetCustomer: string | null;      // Can AI identify who this is for?
    coreService: string | null;         // Can AI extract the main service/product?
    differentiator: string | null;      // Can AI find what makes this unique?
    location: string | null;            // Can AI determine location (if relevant)?
    priceSignal: string | null;         // Any pricing tier signals?
  };
  structuredDataReadiness: string;     // Is the brand info structured for AI parsing?
  searchIntentAlignment: string;       // Does the brand match what people actually search?
  llmIndexability: string;             // How would an LLM summarize this brand?
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
  platformSpecific: Record<string, string>;
  topThreeKillers: string[];           // Top 3 things actively hurting this brand
  quickWins: string[];                 // Top 3 highest-ROI immediate fixes
};

// ─── Shape Validator ──────────────────────────────────────────────────────────

function isReportShape(obj: any): obj is AnalysisReport {
  if (!obj || typeof obj !== "object") return false;

  const hasScore = (o: any, key: string) =>
    o[key] &&
    typeof o[key].score === "number" &&
    typeof o[key].rating === "string" &&
    typeof o[key].summary === "string";

  return (
    typeof obj.overallScore === "number" &&
    typeof obj.severityLevel === "string" &&
    typeof obj.executiveSummary === "string" &&
    hasScore(obj, "brandClarity") &&
    Array.isArray(obj.brandClarity.insights) &&
    Array.isArray(obj.brandClarity.redFlags) &&
    typeof obj.brandClarity.recommendations === "string" &&
    hasScore(obj, "engagementQuality") &&
    Array.isArray(obj.engagementQuality.insights) &&
    Array.isArray(obj.engagementQuality.redFlags) &&
    typeof obj.engagementQuality.recommendations === "string" &&
    hasScore(obj, "contentConsistency") &&
    Array.isArray(obj.contentConsistency.insights) &&
    Array.isArray(obj.contentConsistency.redFlags) &&
    typeof obj.contentConsistency.recommendations === "string" &&
    obj.humanReadability &&
    typeof obj.humanReadability.score === "number" &&
    typeof obj.humanReadability.fiveSecondTest === "string" &&
    typeof obj.humanReadability.fifthGraderTest === "string" &&
    Array.isArray(obj.humanReadability.jargonDetected) &&
    obj.aiReadability &&
    typeof obj.aiReadability.score === "number" &&
    obj.aiReadability.entityExtraction &&
    typeof obj.aiReadability.llmIndexability === "string" &&
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
  platformList: string
): string {
  return `
You are AriClear's core brand analysis engine — the most rigorous, unsparing brand evaluation system available to small businesses and founders. Your entire value comes from being HONEST, SPECIFIC, and BRUTALLY ACCURATE. Inflated scores destroy trust and harm the user.

You are analyzing a brand submission for AriClear, a web app that helps founders and small businesses understand if their brand is actually clear to real humans AND to AI systems (LLMs, search engines, recommendation systems).

═══════════════════════════════════════════════════════
BUSINESS BEING ANALYZED
═══════════════════════════════════════════════════════
Name: ${businessName}
Description: ${businessDescription}
Target Audience: ${targetAudience}
Active Platforms: ${platformList}

═══════════════════════════════════════════════════════
SCORING PHILOSOPHY — INTERNALIZE THIS
═══════════════════════════════════════════════════════

Reality check: 80% of small businesses score below 55. A score of 70+ should feel HARD to earn.

SCORE BANDS:
• 0–39   → Critical: Brand is actively confusing or invisible. Needs full rethinking.
• 40–54  → Weak: Significant gaps. Blends into background noise.
• 55–69  → Average: Mediocre. Some structure but missing differentiation.
• 70–79  → Good: Solid foundation, notable gaps still exist.
• 80–89  → Strong: Clear, differentiated, strategically coherent.
• 90–100 → Excellent: Rare. Reserved for exceptionally clear, differentiated brands.

DEDUCT POINTS AGGRESSIVELY FOR:
- Generic language ("innovative", "seamless", "passionate", "solutions", "leverage", "world-class", "cutting-edge", "empower", "transform", "holistic")
- Missing answer to: WHAT do you do / WHO is it for / WHY choose you
- No concrete differentiator from competitors
- Vague or missing target audience
- Platform presence without strategic purpose
- Description that reads like a mission statement instead of a value proposition

RATING CALIBRATION:
• "Excellent" (80-100): Crystal-clear value prop + genuine differentiation + strategic depth
• "Good" (60-79): Solid but generic in 1-2 key areas, needs refinement
• "Needs Work" (40-59): Most businesses. Unclear, generic, or unfocused
• "Critical" (0-39): Actively harmful to the brand — confusing, empty, or misleading

═══════════════════════════════════════════════════════
WHAT TO EVALUATE
═══════════════════════════════════════════════════════

1. BRAND CLARITY
   The 5-second rule: Would someone IMMEDIATELY understand what this business does, for whom, and why to care?
   
   Deduct heavily if:
   - The description doesn't answer WHO it's for specifically
   - The name gives zero clue about the category
   - The description could apply to 1,000 other businesses
   - There is no concrete "instead of [alternative]" positioning
   - Uses industry jargon that outsiders won't understand
   - The value prop is buried under fluff

2. ENGAGEMENT QUALITY
   Would the TARGET AUDIENCE actually care? Would they stop scrolling?
   
   Deduct heavily if:
   - No emotional hook or clear "this is for me" signal
   - The brand feels corporate when it should feel human (or vice versa for B2B)
   - Nothing makes it MEMORABLE or different from a dozen competitors
   - The audience is too broad ("everyone" or "businesses")
   - The tone doesn't match what the audience actually responds to
   - No evidence of understanding the audience's specific pain points

3. CONTENT CONSISTENCY
   Is there evidence of a coherent brand strategy?
   
   Deduct heavily if:
   - The description suggests scattered platform presence with no clear angle
   - No consistent voice or theme is detectable
   - Platform choices don't match the target audience's habits
   - Content would likely be random because there's no clear POV
   - Mixed signals between the name, description, and platforms

4. HUMAN READABILITY (NEW — Core AriClear metric)
   This tests whether a REAL HUMAN — a distracted, skeptical prospect — can quickly understand and trust this brand.
   
   Run these mental tests:
   a) 5-Second Test: Imagine showing someone this brand for 5 seconds. What would they remember? What would confuse them?
   b) 5th Grader Test: Could a 10-year-old explain what this business does to their parents?
   c) Jargon Scan: List every buzzword, corporate phrase, or vague term that adds no meaning
   d) Value Prop Clarity: Is the specific benefit (not feature) of this brand immediately clear?
   e) Emotional Resonance: Does this make a human feel ANYTHING — curiosity, relief, recognition, excitement?

5. AI READABILITY (NEW — Core AriClear metric)
   Modern brands need to be parseable by AI systems: LLMs, search engines, recommendation algorithms, voice assistants, ChatGPT, Perplexity, etc.
   
   Test entity extraction:
   a) Business Category: What exact category would an AI file this under?
   b) Target Customer: Who would an AI say this serves? (Be specific or mark null)
   c) Core Service/Product: What exactly does this business sell/offer?
   d) Differentiator: What unique claim can an AI extract?
   e) Location: For local businesses, is location extractable?
   f) Price Signal: Can an AI infer the pricing tier (budget/mid/premium)?
   
   Evaluate:
   - Structured Data Readiness: Is the information organized so AI can parse it cleanly?
   - Search Intent Alignment: Does the brand language match what the target audience actually types into search?
   - LLM Indexability: If someone asked ChatGPT "recommend a [category] business," how would this one be described? Would it even be extractable?

═══════════════════════════════════════════════════════
OUTPUT FORMAT — STRICT JSON ONLY
═══════════════════════════════════════════════════════

Return ONLY valid JSON. No markdown, no backticks, no preamble, no explanation outside the JSON.

{
  "overallScore": number (0-100, weighted average of all 5 metrics),
  "severityLevel": "Critical" | "Weak" | "Average" | "Strong" | "Excellent",
  "executiveSummary": "3-4 sentences. Lead with the single biggest problem. Be specific about what's broken and why it costs them customers. End with the core shift needed.",

  "brandClarity": {
    "score": number (0-100),
    "rating": "Excellent" | "Good" | "Needs Work" | "Critical",
    "summary": "2-3 sentences. Be honest about clarity failures. Quote specific phrases that are vague.",
    "insights": [
      "Specific thing that would make a prospect confused or uncertain",
      "Specific gap in the value proposition",
      "Specific missing information a customer needs"
    ],
    "recommendations": "2-3 sentences with SPECIFIC rewrites or fixes. Example: 'Replace [vague phrase] with [specific alternative].'",
    "redFlags": ["List of specific phrases or gaps that are actively hurting clarity"]
  },

  "engagementQuality": {
    "score": number (0-100),
    "rating": "Excellent" | "Good" | "Needs Work" | "Critical",
    "summary": "2-3 sentences honestly assessing differentiation and audience fit.",
    "insights": [
      "Why the target audience would scroll past without engaging",
      "Specific competitor advantage this brand is leaving on the table",
      "What emotional or rational hook is missing"
    ],
    "recommendations": "2-3 sentences with SPECIFIC engagement improvements, not generic tips.",
    "redFlags": ["Specific things that would repel the target audience"]
  },

  "contentConsistency": {
    "score": number (0-100),
    "rating": "Excellent" | "Good" | "Needs Work" | "Critical",
    "summary": "2-3 sentences on strategic coherence — or lack of it.",
    "insights": [
      "Specific strategic gap or fragmentation risk",
      "What would make content feel random or off-brand",
      "Platform-strategy mismatch if any"
    ],
    "recommendations": "2-3 sentences with SPECIFIC strategic direction, not 'be consistent'.",
    "redFlags": ["Specific consistency risks"]
  },

  "humanReadability": {
    "score": number (0-100),
    "rating": "Excellent" | "Good" | "Needs Work" | "Critical",
    "fiveSecondTest": "Describe exactly what a person sees/understands in 5 seconds and what remains unclear.",
    "fifthGraderTest": "Write what a 10-year-old would say this business does, or explain why they couldn't.",
    "jargonDetected": ["Every buzzword, vague corporate phrase, or meaningless term found"],
    "valuePropositionClarity": "Is the benefit (not feature) clear to a first-time visitor? Explain specifically.",
    "emotionalResonance": "Does this brand evoke ANY emotion or recognition in the target audience? What's missing?",
    "summary": "2-3 sentences. Be specific about human comprehension failures.",
    "recommendations": "SPECIFIC fixes to make this immediately legible to a distracted human."
  },

  "aiReadability": {
    "score": number (0-100),
    "rating": "Excellent" | "Good" | "Needs Work" | "Critical",
    "entityExtraction": {
      "businessCategory": "Exact category string or null if ambiguous",
      "targetCustomer": "Specific customer description or null if unclear",
      "coreService": "Exact service/product or null if unclear",
      "differentiator": "Unique claim an AI can extract, or null if none found",
      "location": "Location if relevant/extractable, or null",
      "priceSignal": "Budget / Mid-range / Premium / Unknown"
    },
    "structuredDataReadiness": "Can an AI parse this brand cleanly? What would it fail on?",
    "searchIntentAlignment": "Does the brand language match actual search queries? What terms are they missing?",
    "llmIndexability": "If someone asked an AI assistant to recommend this type of business, how would this brand be described — or would it be skipped entirely?",
    "summary": "2-3 sentences on AI/machine readability failures.",
    "recommendations": "SPECIFIC fixes to improve AI discoverability and extractability."
  },

  "platformSpecific": {
    "platformName": "The single most critical risk or mistake for THIS business on THIS specific platform."
  },

  "topThreeKillers": [
    "The #1 thing actively costing this brand customers right now",
    "The #2 structural problem that prevents growth",
    "The #3 gap that competitors will exploit"
  ],

  "quickWins": [
    "Highest-ROI fix that could be done today (be specific)",
    "Second fastest improvement with clear instructions",
    "Third quick win with measurable expected impact"
  ]
}

ABSOLUTE RULES:
1. Never use generic advice ("be authentic", "engage your audience", "post consistently")
2. Every insight must reference THIS SPECIFIC business — quote their description when helpful
3. Every recommendation must be actionable with no ambiguity
4. Null values in entityExtraction are honest signals — use them when warranted
5. topThreeKillers and quickWins must each have exactly 3 items
6. If the description is copy-paste generic, say so explicitly
7. Lower scores are more useful than comfortable ones
8. The humanReadability and aiReadability scores carry equal weight to the other three metrics
`.trim();
}

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as RequestData;
    const { businessName, businessDescription, targetAudience, platforms } = data;

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
          error: "Business description is too short. Provide at least 30 characters for meaningful analysis.",
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
      : "No platforms provided — general brand analysis only";

    // ── Claude API Call ─────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(
      businessName,
      businessDescription,
      targetAudience,
      platformList
    );

    const userMessage = JSON.stringify(
      {
        businessName,
        businessDescription,
        targetAudience,
        activePlatforms: activePlatforms.map(([platform, handle]) => ({
          platform,
          handle,
        })),
      },
      null,
      2
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.1, // Very low — we want consistent, analytical output
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    console.log("✅ Claude response received");

    // ── Extract Text ────────────────────────────────────────────────────────
    const outputText = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("")
      .trim();

    if (!outputText) {
      return NextResponse.json(
        { error: "Empty response from analysis engine." },
        { status: 500 }
      );
    }

    // ── Parse JSON ──────────────────────────────────────────────────────────
    let report: any;
    try {
      // Strip any accidental markdown fences
      const cleaned = outputText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      report = JSON.parse(cleaned);
    } catch {
      console.error("Analysis engine returned invalid JSON:", outputText.slice(0, 500));
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
    // Ensure overallScore is consistent with component scores
    const componentScores = [
      report.brandClarity.score,
      report.engagementQuality.score,
      report.contentConsistency.score,
      report.humanReadability.score,
      report.aiReadability.score,
    ];
    const computedAverage = Math.round(
      componentScores.reduce((a, b) => a + b, 0) / componentScores.length
    );
    // Allow a small variance; if it's off by more than 5, recalculate
    if (Math.abs(report.overallScore - computedAverage) > 5) {
      report.overallScore = computedAverage;
    }

    // ── Severity Level Consistency ──────────────────────────────────────────
    const score = report.overallScore;
    const expectedSeverity =
      score >= 90 ? "Excellent" :
      score >= 80 ? "Strong" :
      score >= 70 ? "Average" :
      score >= 55 ? "Weak" :
      "Critical";
    report.severityLevel = expectedSeverity;

    console.log(
      `🎉 Analysis complete — ${businessName}: ${report.overallScore}/100 (${report.severityLevel})`
    );

    return NextResponse.json(report);

  } catch (err: any) {
    console.error("❌ Brand analysis error:", err);

    // ── Anthropic-specific errors ───────────────────────────────────────────
    if (err?.status === 429 || err?.error?.type === "rate_limit_error") {
      return NextResponse.json(
        {
          error: "Analysis engine is temporarily busy. Please wait a moment and try again.",
          errorCode: "RATE_LIMITED",
          rateLimited: true,
        },
        { status: 429 }
      );
    }

    if (err?.status === 401 || err?.error?.type === "authentication_error") {
      return NextResponse.json(
        {
          error: "Analysis service configuration error. Please contact support.",
          errorCode: "AUTH_ERROR",
        },
        { status: 500 }
      );
    }

    if (err?.status === 529 || err?.error?.type === "overloaded_error") {
      return NextResponse.json(
        {
          error: "Analysis engine is overloaded. Please try again in a few seconds.",
          errorCode: "OVERLOADED",
          retryable: true,
        },
        { status: 503 }
      );
    }

    if (err?.status) {
      return NextResponse.json(
        {
          error: `Analysis service error (${err.status}): ${err.message ?? "Unknown error"}`,
          errorCode: "API_ERROR",
        },
        { status: err.status }
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected error while analyzing brand awareness. Please try again.",
        errorCode: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}