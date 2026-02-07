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
You are a brutally honest brand awareness expert and marketing strategist who has evaluated thousands of businesses. Your job is to provide a CRITICAL, no-nonsense analysis that identifies real problems and gaps.

Analyze the following business with a skeptical, critical eye:

Business Information:
- Name: ${businessName}
- Description: ${businessDescription}
- Target Audience: ${targetAudience}
- Active Platforms: ${platformList}

CRITICAL EVALUATION APPROACH:
- Default to LOWER scores unless there's clear evidence of excellence
- Most businesses score 40-65, not 70-90
- Be harsh but constructive - point out what's actually broken or missing
- Don't sugarcoat weaknesses
- Identify gaps that competitors would exploit
- Focus on what would make a customer SKIP this business

Evaluate these three core metrics with CRITICAL scrutiny:

1. BRAND CLARITY (Can a distracted person instantly understand what you do?)
   - Would someone scrolling their feed immediately "get it"?
   - Is the value proposition crystal clear or generic/vague?
   - Could a 5th grader explain what this business does after reading the description?
   - What critical information is MISSING that would help understanding?
   - Is the business description full of jargon, buzzwords, or unclear language?

2. ENGAGEMENT QUALITY (Would people actually care enough to engage?)
   - Is there anything genuinely interesting or differentiated about this brand?
   - Would the target audience see themselves reflected in this brand?
   - Does this feel authentic or like every other business in the space?
   - What would make someone CHOOSE to follow/engage vs. scroll past?
   - Are there red flags that would turn people away?

3. CONTENT CONSISTENCY (Is there a coherent brand strategy?)
   - Based on the description, is there a clear content angle or would it be random?
   - Does the brand voice feel distinct or generic?
   - Would content across platforms feel disconnected or unified?
   - Is there evidence of strategic thinking or just "we should be on social media"?
   - What's the actual differentiator that would carry across platforms?

Return ONLY valid JSON with this EXACT shape (no extra keys, no markdown, no backticks):

{
  "overallScore": number (0-100, average of the three metrics),
  "brandClarity": {
    "score": number (0-100),
    "rating": "Excellent" | "Good" | "Needs Work",
    "summary": "2-3 sentences being HONEST about clarity issues, vague language, or missing information",
    "insights": [
      "Critical insight about what's unclear or confusing",
      "Specific gap or weakness in the value proposition",
      "What would make a potential customer confused or uncertain"
    ],
    "recommendations": "2-3 sentences with SPECIFIC, actionable fixes (not generic advice like 'be more clear')"
  },
  "engagementQuality": {
    "score": number (0-100),
    "rating": "Excellent" | "Good" | "Needs Work",
    "summary": "2-3 sentences honestly assessing if this brand would stand out or blend in",
    "insights": [
      "Critical insight about differentiation (or lack thereof)",
      "Specific weakness in positioning vs. competitors",
      "What would make the target audience scroll past without engaging"
    ],
    "recommendations": "2-3 sentences with SPECIFIC ways to become more engaging (not 'post more' or generic tips)"
  },
  "contentConsistency": {
    "score": number (0-100),
    "rating": "Excellent" | "Good" | "Needs Work",
    "summary": "2-3 sentences honestly assessing if there's a coherent content strategy evident",
    "insights": [
      "Critical insight about strategic gaps or unclear direction",
      "Specific consistency risk across platforms",
      "What would fragment the brand experience"
    ],
    "recommendations": "2-3 sentences with SPECIFIC strategic guidance (not 'be consistent' but HOW to be consistent)"
  },
  "platformSpecific": {
    "platformName": "Critical, platform-specific insight - what's the biggest risk or gap on THIS platform for THIS business?"
  }
}

SCORING GUIDELINES (BE STRICT):
- "Excellent" (80-100): Rare. Crystal clear positioning, truly differentiated, strategic depth evident
- "Good" (60-79): Solid foundation but notable gaps, somewhat generic, needs refinement
- "Needs Work" (0-59): MOST businesses fall here. Unclear, generic, strategic gaps, blends in

CRITICAL RULES:
- NO generic feedback ("be more authentic", "engage with audience", "post consistently")
- Every insight must identify a SPECIFIC problem with THIS business
- Every recommendation must be ACTIONABLE and SPECIFIC to their situation
- If the description is vague/generic, call it out explicitly
- If you can't tell what makes them different, SAY THAT
- Lower scores are MORE helpful than inflated ones
- Think: "Would I invest in or recommend this business based on this information?"
- For platformSpecific, focus on the BIGGEST RISK or MISTAKE they'd make on each platform

Be tough. Be honest. Be helpful.
`.trim();

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