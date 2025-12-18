/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import OpenAI from "openai";
import * as cheerio from "cheerio";

export const runtime = "nodejs"; // cheerio works best on node runtime

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

  // Remove noisy tags
  $("script, style, noscript, svg, img").remove();

  const bodyTextRaw = $("body").text().replace(/\s+/g, " ").trim();
  const bodySnippet = bodyTextRaw.slice(0, 5000); // MVP limit

  return { title, metaDescription, h1, h2s, bodySnippet };
}

function isReportShape(obj: any) {
  return (
    obj &&
    typeof obj === "object" &&
    obj.human &&
    typeof obj.human.clarityScore === "number" &&
    typeof obj.human.whatItSeemsLike === "string" &&
    Array.isArray(obj.human.confusions) &&
    obj.ai &&
    typeof obj.ai.aiSeoScore === "number" &&
    typeof obj.ai.aiSummary === "string" &&
    Array.isArray(obj.ai.missingKeywords) &&
    obj.copy &&
    typeof obj.copy.suggestedHeadline === "string" &&
    typeof obj.copy.suggestedSubheadline === "string" &&
    typeof obj.copy.suggestedCTA === "string"
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

    const instructions = `
      You are AriClear, a website clarity + AI SEO comprehension auditor.
      
      Analyze the provided page content.

      Return ONLY a valid JSON object with this EXACT shape (no extra keys, no markdown):

      {
        "human": {
          "clarityScore": number (0-100),
          "whatItSeemsLike": string,
          "confusions": string[] (3-6 items)
        },
        "ai": {
          "aiSeoScore": number (0-100),
          "aiSummary": string,
          "missingKeywords": string[] (5-10 items)
        },
        "copy": {
          "suggestedHeadline": string,
          "suggestedSubheadline": string,
          "suggestedCTA": string
        }
      }

      Guidelines:
      - "human.clarityScore": based on whether a first-time visitor understands what the site does in ~10 seconds.
      - "ai.aiSeoScore": based on whether an AI model can classify the site and extract keywords cleanly.
      - Keep suggestions specific and actionable, not generic.
      - Make the suggested headline/subheadline/CTA match what the site actually offers.
      `.trim();

    // ✅ Chat Completions + JSON mode (works with openai@6.14.0)
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: instructions },
        {
          role: "user",
          content: JSON.stringify({ url, extracted }, null, 2),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

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

    // Optional: basic runtime validation so your UI doesn't break
    if (!isReportShape(report)) {
      console.error("AI returned unexpected shape:", report);
      return NextResponse.json(
        { error: "AI returned unexpected response shape." },
        { status: 500 }
      );
    }

    return NextResponse.json(report);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error while analyzing the URL." },
      { status: 500 }
    );
  }
}
