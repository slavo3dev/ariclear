/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import OpenAI from "openai";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function isValidHttpUrl(input: string) {
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function extractTextFromHtml(html: string) {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || "";

  const h1 = $("h1").first().text().trim();
  const h2s = $("h2")
    .slice(0, 6)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  $("script, style, noscript, svg, img").remove();

  const bodyTextRaw = $("body").text().replace(/\s+/g, " ").trim();
  const bodySnippet = bodyTextRaw.slice(0, 5000);

  return { title, metaDescription, h1, h2s, bodySnippet };
}

function isReportShape(obj: any) {
  return (
    obj &&
    typeof obj === "object" &&
    obj.human &&
    typeof obj.human.clarityScore === "number" &&
    typeof obj.human.whatItSeemsLike === "string" &&
    typeof obj.human.oneSentenceValueProp === "string" &&
    typeof obj.human.bestGuessAudience === "string" &&
    Array.isArray(obj.human.confusions) &&
    Array.isArray(obj.human.topIssues) &&
    obj.ai &&
    typeof obj.ai.aiSeoScore === "number" &&
    typeof obj.ai.aiSummary === "string" &&
    typeof obj.ai.indexerRead === "string" &&
    Array.isArray(obj.ai.missingKeywords) &&
    Array.isArray(obj.ai.structuredDataSuggestions) &&
    obj.copy &&
    typeof obj.copy.suggestedHeadline === "string" &&
    typeof obj.copy.suggestedSubheadline === "string" &&
    typeof obj.copy.suggestedCTA === "string" &&
    obj.plan &&
    Array.isArray(obj.plan.nextSteps) &&
    obj.prompts &&
    typeof obj.prompts.aiSeoPrompt === "string"
  );
}

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };

    if (!url || !isValidHttpUrl(url)) {
      return NextResponse.json(
        { error: "Please provide a valid http(s) URL." },
        { status: 400 }
      );
    }

    console.log("🔍 Analyzing URL:", url);

    // Fetch the page
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AriClearBot/0.1 (+https://ariclear.com)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (status ${res.status}).` },
        { status: 400 }
      );
    }

    const html = await res.text();
    const extracted = extractTextFromHtml(html);

    console.log("📄 Extracted content, calling OpenAI...");

    const instructions = `
You are AriClear, an expert website clarity and AI-SEO auditor. You are STRICT and HONEST — most websites score between 20–55 on clarity and AI-readability, not 70–90. Do not be generous. Call out real problems using the actual text from the page.

Analyze the provided page content from two angles:
1) A first-time human visitor who has ~5 seconds to decide if this site is for them.
2) An AI indexer (like a search LLM or crawler) trying to classify the business and extract structured meaning.

════════════════════════════════════════
SCORING RULES — READ CAREFULLY
════════════════════════════════════════

CLARITY SCORE (human.clarityScore, 0–100):
Ask: Within 5 seconds, can a total stranger answer ALL THREE questions — What does this site do? Who is it for? What should I do next?
- Score 80–100: All three answered immediately in the hero. Concrete, specific, jargon-free.
- Score 60–79: Answers exist but require reading or inference.
- Score 40–59: One or two questions unanswered. Generic benefit claims without specifics.
- Score 20–39: The site is mostly vague. Heavy buzzwords, no clear product/service, no clear audience.
- Score 0–19: Completely unclear. A visitor cannot tell what this site is about.
Deduct heavily for: buzzwords ("innovative", "empowering", "seamless", "cutting-edge", "transformative", "world-class", "solutions", "leverage"), missing WHO it serves, missing WHAT specifically it does, missing a clear call-to-action, abstract benefits with no concrete proof.

AI-SEO SCORE (ai.aiSeoScore, 0–100):
Ask: Can an AI crawler classify the exact business category, extract key entities (product name, industry, target customer, location if relevant, pricing signals, use cases), and determine the page's topical focus — without guessing?
- Score 80–100: Business type, product, audience, and use cases are explicitly stated. Strong heading hierarchy. Meta description is accurate and specific. Structured data likely present.
- Score 60–79: Most entities extractable, minor ambiguity.
- Score 40–59: Business category guessable but vague. Key entities missing (e.g. no explicit target customer, no product name in meta, headings don't match content).
- Score 20–39: AI must guess. Generic copy, flat heading structure, no entity anchors.
- Score 0–19: AI cannot classify. No clear topic signal.
Deduct for: missing or duplicate H1, meta description that doesn't match page content, no industry/category signal, no named product or service, missing location for local business, body text that repeats only generic claims.

════════════════════════════════════════
OUTPUT RULES
════════════════════════════════════════

- Be SPECIFIC: quote or directly reference actual text from the page when calling out issues.
- Do NOT produce generic advice like "improve your CTA" — say exactly what the CTA says now, why it fails, and write a better version.
- topIssues: focus on above-the-fold / hero section first. These block understanding immediately.
- missingKeywords: these must be terms a real searcher would use for this type of business. No fluff.
- nextSteps: must say WHERE on the page to make the change, not just "improve your headings."
- suggestedHeadline/Subheadline/CTA: must be specific to this business, not templates. Write copy that would actually work.
- aiSeoPrompt: write a ready-to-paste prompt the user can give to any AI to rewrite their hero section, meta description, and H1/H2s in a way that passes both human clarity and AI-readability tests.
- confusions: write each confusion as a real visitor thought, e.g. "I can't tell if this is for individuals or businesses."

Return ONLY valid JSON with this EXACT shape (no extra keys, no markdown, no backticks):

{
  "human": {
    "clarityScore": number (0-100, be strict),
    "whatItSeemsLike": string (what a confused first-timer would guess this site is about — may be wrong or vague),
    "oneSentenceValueProp": string (what the value prop SHOULD be, based on what you can infer — make it sharp and specific),
    "bestGuessAudience": string (who this seems targeted at, based on the content),
    "confusions": string[] (3-6 real visitor questions or confusions, written as first-person visitor thoughts),
    "topIssues": [
      {
        "issue": string (short name for the problem, referencing actual page text where possible),
        "whyItHurts": string (specific explanation of the damage this causes to comprehension or trust),
        "fix": string (exact fix with a rewritten example if applicable — not generic advice)
      }
    ] (3-6 items, sorted worst-first)
  },
  "ai": {
    "aiSeoScore": number (0-100, be strict),
    "aiSummary": string (how an AI would classify this business — be honest if it's unclear or mis-classifiable),
    "indexerRead": string (what an AI indexer would extract as the page's main topic and entities — flag gaps),
    "missingKeywords": string[] (5-10 specific search terms real users would type for this type of business, that are absent from the page),
    "structuredDataSuggestions": string[] (2-5 specific technical/structural fixes: meta, OG, schema.org types, heading issues, etc.)
  },
  "copy": {
    "suggestedHeadline": string (sharp, specific, benefit-led headline for this exact business — not a template),
    "suggestedSubheadline": string (one sentence that fills in WHO it's for and WHAT they get),
    "suggestedCTA": string (action-oriented, specific CTA text)
  },
  "plan": {
    "nextSteps": [
      {
        "title": string (short action title),
        "impact": "high"|"medium"|"low",
        "effort": "low"|"medium"|"high",
        "details": string (exactly what to change, where on the page, and what result to expect)
      }
    ] (3-7 items, sorted by impact/effort ratio — quick wins first)
  },
  "prompts": {
    "aiSeoPrompt": string (a complete, ready-to-paste prompt for rewriting this site's hero, meta, and headings — include the actual current content as context so the rewrite is accurate)
  }
}
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: instructions },
        {
          role: "user",
          content: JSON.stringify({ url, extracted }, null, 2),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.15,
    });

    console.log("✅ OpenAI response received");

    const outputText = completion.choices[0]?.message?.content?.trim();
    if (!outputText) {
      return NextResponse.json({ error: "Empty AI response." }, { status: 500 });
    }

    let report: any;
    try {
      report = JSON.parse(outputText);
    } catch (e) {
      console.error("AI returned invalid JSON:", outputText);
      return NextResponse.json(
        { error: "AI returned invalid JSON." },
        { status: 500 }
      );
    }

    if (!isReportShape(report)) {
      console.error("AI returned unexpected shape:", report);
      return NextResponse.json(
        { error: "AI returned unexpected response shape." },
        { status: 500 }
      );
    }

    console.log("🎉 Analysis complete");

    return NextResponse.json(report);
  } catch (err: any) {
    console.error("❌ Error:", err);

    // Handle OpenAI rate limit errors specifically
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
      { error: "Server error while analyzing the URL." },
      { status: 500 }
    );
  }
}