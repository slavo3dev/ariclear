/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

type MetricAnalysis = {
  score: number;
  rating: "Excellent" | "Good" | "Needs Work";
  summary: string;
  insights: string[];
  recommendations: string;
};

type AnalysisReport = {
  overallScore: number;
  brandClarity: MetricAnalysis;
  engagementQuality: MetricAnalysis;
  contentConsistency: MetricAnalysis;
  platformSpecific: Record<string, string>;
};

function isReportShape(obj: any): obj is AnalysisReport {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.overallScore === "number" &&
    obj.brandClarity &&
    typeof obj.brandClarity.score === "number" &&
    typeof obj.brandClarity.rating === "string" &&
    typeof obj.brandClarity.summary === "string" &&
    Array.isArray(obj.brandClarity.insights) &&
    typeof obj.brandClarity.recommendations === "string" &&
    obj.engagementQuality &&
    typeof obj.engagementQuality.score === "number" &&
    typeof obj.engagementQuality.rating === "string" &&
    typeof obj.engagementQuality.summary === "string" &&
    Array.isArray(obj.engagementQuality.insights) &&
    typeof obj.engagementQuality.recommendations === "string" &&
    obj.contentConsistency &&
    typeof obj.contentConsistency.score === "number" &&
    typeof obj.contentConsistency.rating === "string" &&
    typeof obj.contentConsistency.summary === "string" &&
    Array.isArray(obj.contentConsistency.insights) &&
    typeof obj.contentConsistency.recommendations === "string" &&
    obj.platformSpecific &&
    typeof obj.platformSpecific === "object"
  );
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as RequestData;

    const { businessName, businessDescription, targetAudience, platforms } =
      data;

    if (!businessName || !businessDescription || !targetAudience) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("🔍 Analyzing brand:", businessName);

    // Filter out empty platforms
    const activePlatforms = Object.entries(platforms).filter(
      ([_, value]) => value && value.trim() !== ""
    );

    const platformList = activePlatforms.length
      ? activePlatforms.map(([key]) => key).join(", ")
      : "general analysis (no specific platforms provided)";

    const instructions = `
You are a brand awareness expert analyzing social media presence and brand clarity.

Analyze the following business and provide a comprehensive brand awareness evaluation.

Business Information:
- Name: ${businessName}
- Description: ${businessDescription}
- Target Audience: ${targetAudience}
- Active Platforms: ${platformList}

Provide scores (1-100) and detailed insights for these three core metrics:

1. BRAND CLARITY (Do people understand what the business does?)
   - How clear is the messaging?
   - Is the value proposition obvious?
   - Would a first-time visitor understand the business immediately?

2. ENGAGEMENT QUALITY (Are interactions meaningful?)
   - Quality of potential audience interactions
   - Authenticity of engagement approach
   - Community building effectiveness

3. CONTENT CONSISTENCY (Is messaging coherent across platforms?)
   - Visual identity consistency potential
   - Message alignment across touchpoints
   - Brand voice consistency
   - Content strategy coherence

Return ONLY valid JSON with this EXACT shape (no extra keys, no markdown, no backticks):

{
  "overallScore": number (0-100, average of the three metrics),
  "brandClarity": {
    "score": number (0-100),
    "rating": "Excellent" | "Good" | "Needs Work",
    "summary": "2-3 sentence summary of brand clarity assessment",
    "insights": ["specific insight 1", "specific insight 2", "specific insight 3"],
    "recommendations": "detailed 2-3 sentence recommendation paragraph"
  },
  "engagementQuality": {
    "score": number (0-100),
    "rating": "Excellent" | "Good" | "Needs Work",
    "summary": "2-3 sentence summary of engagement quality assessment",
    "insights": ["specific insight 1", "specific insight 2", "specific insight 3"],
    "recommendations": "detailed 2-3 sentence recommendation paragraph"
  },
  "contentConsistency": {
    "score": number (0-100),
    "rating": "Excellent" | "Good" | "Needs Work",
    "summary": "2-3 sentence summary of content consistency assessment",
    "insights": ["specific insight 1", "specific insight 2", "specific insight 3"],
    "recommendations": "detailed 2-3 sentence recommendation paragraph"
  },
  "platformSpecific": {
    "platformName": "brief platform-specific insight for each active platform"
  }
}

Rating Guidelines:
- "Excellent": 80-100 (Strong, clear, effective)
- "Good": 60-79 (Solid foundation, room for improvement)
- "Needs Work": 0-59 (Significant improvements needed)

Rules:
- Be specific to the business description and target audience provided
- Insights should be actionable and unique to this business
- Recommendations should be concrete and implementable
- For platformSpecific, only include platforms that were listed as active
- If no platforms were provided, return an empty object for platformSpecific
`.trim();

    console.log("📤 Calling OpenAI...");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: instructions },
        {
          role: "user",
          content: JSON.stringify(
            {
              businessName,
              businessDescription,
              targetAudience,
              platforms: activePlatforms.map(([key, value]) => ({
                platform: key,
                handle: value,
              })),
            },
            null,
            2
          ),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    console.log("✅ OpenAI response received");

    const outputText = completion.choices[0]?.message?.content?.trim();
    if (!outputText) {
      return NextResponse.json(
        { error: "Empty AI response" },
        { status: 500 }
      );
    }

    let report: any;
    try {
      report = JSON.parse(outputText);
    } catch (e) {
      console.error("AI returned invalid JSON:", outputText);
      return NextResponse.json(
        { error: "AI returned invalid JSON" },
        { status: 500 }
      );
    }

    if (!isReportShape(report)) {
      console.error("AI returned unexpected shape:", report);
      return NextResponse.json(
        { error: "AI returned unexpected response shape" },
        { status: 500 }
      );
    }

    console.log("🎉 Analysis complete");

    return NextResponse.json(report);
  } catch (err: any) {
    console.error("❌ Error:", err);

    // Handle OpenAI rate limit errors
    if (err?.status === 429 || err?.code === "rate_limit_exceeded") {
      return NextResponse.json(
        {
          error: "Rate limit reached. Please wait a moment and try again.",
          rateLimited: true,
        },
        { status: 429 }
      );
    }

    // Handle other OpenAI errors
    if (err?.status) {
      return NextResponse.json(
        {
          error: `OpenAI API error: ${err.message || "Unknown error"}`,
          status: err.status,
        },
        { status: err.status }
      );
    }

    return NextResponse.json(
      { error: "Server error while analyzing brand awareness" },
      { status: 500 }
    );
  }
}