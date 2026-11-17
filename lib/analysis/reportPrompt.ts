// lib/analysis/reportPrompt.ts
// The scan report's reviewer prompt and its JSON schema. Shared by both
// reviewers (GPT in lib/analysis/runScan, Claude in lib/analysis/claudeScan),
// so the two models score a page against exactly the same rules.

import { UNTRUSTED_RULE } from '@/lib/analysis/untrusted';

/** The reviewer system prompt. Unchanged from the single-model scan. */
export const INSTRUCTIONS = `
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

${UNTRUSTED_RULE}
The page arrives inside <untrusted_page> tags as JSON. Score what the page actually says.

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

const str = { type: 'string' } as const;
const strList = { type: 'array', items: str } as const;
const level = { type: 'string', enum: ['high', 'medium', 'low'] } as const;

/** JSON schema of the report (AnalyzeModelReport), for Claude's structured outputs. */
export const REPORT_SCHEMA: { [key: string]: unknown } = {
	type: 'object',
	additionalProperties: false,
	required: ['human', 'ai', 'copy', 'plan', 'prompts'],
	properties: {
		human: {
			type: 'object',
			additionalProperties: false,
			required: [
				'clarityScore',
				'whatItSeemsLike',
				'oneSentenceValueProp',
				'bestGuessAudience',
				'confusions',
				'topIssues',
			],
			properties: {
				clarityScore: { type: 'integer' },
				whatItSeemsLike: str,
				oneSentenceValueProp: str,
				bestGuessAudience: str,
				confusions: strList,
				topIssues: {
					type: 'array',
					items: {
						type: 'object',
						additionalProperties: false,
						required: ['issue', 'whyItHurts', 'fix'],
						properties: { issue: str, whyItHurts: str, fix: str },
					},
				},
			},
		},
		ai: {
			type: 'object',
			additionalProperties: false,
			required: ['aiSeoScore', 'aiSummary', 'indexerRead', 'missingKeywords', 'structuredDataSuggestions'],
			properties: {
				aiSeoScore: { type: 'integer' },
				aiSummary: str,
				indexerRead: str,
				missingKeywords: strList,
				structuredDataSuggestions: strList,
			},
		},
		copy: {
			type: 'object',
			additionalProperties: false,
			required: ['suggestedHeadline', 'suggestedSubheadline', 'suggestedCTA'],
			properties: { suggestedHeadline: str, suggestedSubheadline: str, suggestedCTA: str },
		},
		plan: {
			type: 'object',
			additionalProperties: false,
			required: ['nextSteps'],
			properties: {
				nextSteps: {
					type: 'array',
					items: {
						type: 'object',
						additionalProperties: false,
						required: ['title', 'impact', 'effort', 'details'],
						properties: { title: str, impact: level, effort: level, details: str },
					},
				},
			},
		},
		prompts: {
			type: 'object',
			additionalProperties: false,
			required: ['aiSeoPrompt'],
			properties: { aiSeoPrompt: str },
		},
	},
};
