"use client";

import { useState } from "react";
import { Navbar, SiteFooter } from "@ariclear/components";

// ─── Types (mirrors route exactly) ───────────────────────────────────────────

type PlatformData = {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
};

type FormData = {
  businessName: string;
  businessDescription: string;
  targetAudience: string;
  websiteUrl: string;
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
  heroMessageMatch: string;
  audienceSignalMatch: string;
  brandVoiceConsistency: string;
  missingOnWebsite: string[];
  websiteRedFlags: string[];
  summary: string;
  recommendations: string;
};

type AnalysisResult = {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRatingBadgeClass(rating: ScoreRating) {
  switch (rating) {
    case "Excellent": return "bg-green-100 text-green-700 ring-1 ring-green-300";
    case "Good":      return "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300";
    case "Needs Work":return "bg-orange-100 text-orange-700 ring-1 ring-orange-300";
    case "Critical":  return "bg-red-100 text-red-700 ring-1 ring-red-300";
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

function getScoreBarColor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function getSeverityColor(level: AnalysisResult["severityLevel"]) {
  switch (level) {
    case "Excellent": return "text-green-600 bg-green-50 border-green-200";
    case "Strong":    return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "Average":   return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "Weak":      return "text-orange-600 bg-orange-50 border-orange-200";
    case "Critical":  return "text-red-600 bg-red-50 border-red-200";
  }
}

function getOverallRingColor(score: number) {
  if (score >= 80) return "border-green-400";
  if (score >= 60) return "border-yellow-400";
  if (score >= 40) return "border-orange-400";
  return "border-red-400";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full bg-choco-100 rounded-full h-1.5 mt-2">
      <div
        className={`h-1.5 rounded-full transition-all duration-700 ${getScoreBarColor(score)}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function RedFlagsList({ flags }: { flags: string[] }) {
  if (!flags.length) return null;
  return (
    <div className="rounded-xl bg-red-50 border border-red-100 p-4 mb-4">
      <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-600 mb-2">
        🚩 Red Flags
      </h4>
      <ul className="space-y-1.5">
        {flags.map((flag, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-red-700">
            <span className="mt-0.5 shrink-0">→</span>
            <span>{flag}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricCard({
  label,
  title,
  metric,
  children,
}: {
  label: string;
  title: string;
  metric: MetricAnalysis;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-soft border border-choco-100">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-choco-400 mb-0.5">{label}</p>
          <h3 className="text-base font-semibold text-choco-900">{title}</h3>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className={`text-2xl font-bold tabular-nums ${getScoreColor(metric.score)}`}>
            {metric.score}<span className="text-sm font-normal text-choco-400">/100</span>
          </div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getRatingBadgeClass(metric.rating)}`}>
            {metric.rating}
          </span>
        </div>
      </div>

      <ScoreBar score={metric.score} />

      <p className="text-sm text-choco-700 mt-4 mb-4 leading-relaxed">{metric.summary}</p>

      <RedFlagsList flags={metric.redFlags} />

      <div className="rounded-xl bg-cream-50 border border-choco-100 p-4 mb-4">
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-500 mb-2.5">
          Key Insights
        </h4>
        <ul className="space-y-2">
          {metric.insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-choco-700">
              <span className="text-choco-400 mt-0.5 shrink-0">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {children}

      <div className="rounded-xl bg-choco-800 p-4">
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-300 mb-2">
          Recommendations
        </h4>
        <p className="text-xs text-cream-100 leading-relaxed">{metric.recommendations}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BrandAwarenessPage() {
  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    businessDescription: "",
    targetAudience: "",
    websiteUrl: "",
    platforms: {},
  });

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlatformChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      platforms: { ...prev.platforms, [name]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/brand-awareness/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Analysis failed");
      }

      setAnalysis(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze brand awareness");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ businessName: "", businessDescription: "", targetAudience: "", websiteUrl: "", platforms: {} });
    setAnalysis(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const inputClass =
    "w-full rounded-full border border-choco-200 bg-cream-50 px-4 py-3 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-2 focus:ring-choco-500/20 transition-colors";
  const textareaClass =
    "w-full rounded-2xl border border-choco-200 bg-cream-50 px-4 py-3 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-2 focus:ring-choco-500/20 transition-colors resize-none";
  const labelClass =
    "block text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-500 mb-2";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-cream-50">
        {/* Page Header */}
        <div className="border-b border-choco-100 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-choco-400">Brand Analysis</p>
                <h1 className="mt-0.5 text-2xl font-bold text-choco-900">Brand Awareness Evaluator</h1>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-[10px] uppercase tracking-[0.14em] text-choco-400">Powered by</p>
                <p className="text-xs font-medium text-choco-700">Ari_Clear · 6 Metrics</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

          {/* ── FORM STATE ─────────────────────────────────────────────── */}
          {!analysis && (
            <>
              <div className="mb-8 text-center">
                <p className="text-sm text-choco-600 max-w-xl mx-auto">
                  Enter your brand details and we will run a strict 6-metric analysis — including how your website holds up against your brand claims.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-soft border border-choco-100 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Business Name */}
                  <div>
                    <label className={labelClass}>Business Name</label>
                    <input
                      type="text"
                      name="businessName"
                      required
                      value={formData.businessName}
                      onChange={handleInputChange}
                      placeholder="e.g. AriClear"
                      className={inputClass}
                    />
                  </div>

                  {/* Website URL */}
                  <div>
                    <label className={labelClass}>
                      Website URL{" "}
                      <span className="normal-case font-normal text-choco-400 tracking-normal">
                        — we will scan it to check if it matches your brand
                      </span>
                    </label>
                    <input
                      type="text"
                      name="websiteUrl"
                      value={formData.websiteUrl}
                      onChange={handleInputChange}
                      placeholder="https://yourdomain.com"
                      className={inputClass}
                    />
                  </div>

                  {/* Business Description */}
                  <div>
                    <label className={labelClass}>
                      What Does Your Business Do?
                    </label>
                    <textarea
                      name="businessDescription"
                      required
                      value={formData.businessDescription}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Describe your business, products, or services. Be specific — vague descriptions score lower."
                      className={textareaClass}
                    />
                    <p className="mt-1.5 text-[11px] text-choco-400">
                      {formData.businessDescription.length}/2000 · min 30 characters
                    </p>
                  </div>

                  {/* Target Audience */}
                  <div>
                    <label className={labelClass}>Target Audience</label>
                    <input
                      type="text"
                      name="targetAudience"
                      required
                      value={formData.targetAudience}
                      onChange={handleInputChange}
                      placeholder="Be specific — e.g. 'freelance designers aged 25–40 who struggle with client pricing'"
                      className={inputClass}
                    />
                  </div>

                  {/* Social Platforms */}
                  <div>
                    <label className={labelClass}>
                      Social Media Profiles{" "}
                      <span className="normal-case font-normal text-choco-400 tracking-normal">— optional</span>
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {([
                        { name: "instagram", label: "Instagram" },
                        { name: "facebook",  label: "Facebook"  },
                        { name: "twitter",   label: "Twitter/X" },
                        { name: "linkedin",  label: "LinkedIn"  },
                        { name: "tiktok",    label: "TikTok"    },
                        { name: "youtube",   label: "YouTube"   },
                      ] as const).map((p) => (
                        <div key={p.name}>
                          <label className="block text-[10px] text-choco-400 mb-1">{p.label}</label>
                          <input
                            type="text"
                            name={p.name}
                            value={formData.platforms[p.name] || ""}
                            onChange={handlePlatformChange}
                            placeholder="@username or URL"
                            className={inputClass.replace("py-3", "py-2")}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading || formData.businessDescription.length < 30}
                    className="w-full rounded-xl bg-choco-800 px-6 py-3 text-sm font-medium text-cream-50 hover:bg-choco-900 focus:outline-none focus:ring-2 focus:ring-choco-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? "Analyzing — this takes ~15 seconds..." : "Analyze Brand Awareness"}
                  </button>
                </form>
              </div>

              {loading && (
                <div className="mt-6 rounded-2xl bg-white p-10 shadow-soft border border-choco-100 text-center">
                  <div className="w-10 h-10 border-4 border-choco-200 border-t-choco-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm font-medium text-choco-900 mb-1">Running 6-metric brand analysis…</p>
                  <p className="text-xs text-choco-500">Scraping website · Checking human readability · AI parsing · Cross-referencing</p>
                </div>
              )}
            </>
          )}

          {/* ── RESULTS STATE ──────────────────────────────────────────── */}
          {analysis && (
            <div className="space-y-5">

              {/* Overall Score Hero */}
              <div className="rounded-2xl bg-white p-8 shadow-soft border border-choco-100 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-choco-400 mb-1">Analysis Complete</p>
                <h2 className="text-xl font-bold text-choco-900 mb-6">{formData.businessName}</h2>

                <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full border-4 shadow-soft-lg mb-3 ${getOverallRingColor(analysis.overallScore)}`}>
                  <div>
                    <div className={`text-3xl font-bold tabular-nums leading-none ${getScoreColor(analysis.overallScore)}`}>
                      {analysis.overallScore}
                    </div>
                    <div className="text-[10px] text-choco-400 mt-0.5">/100</div>
                  </div>
                </div>

                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold ${getSeverityColor(analysis.severityLevel)}`}>
                  {analysis.severityLevel}
                </div>

                <p className="mt-5 text-sm text-choco-700 leading-relaxed max-w-xl mx-auto">
                  {analysis.executiveSummary}
                </p>
              </div>

              {/* Top 3 Killers */}
              <div className="rounded-2xl bg-red-50 border border-red-200 p-6">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-600 mb-4">
                  🔴 Top 3 Brand Killers
                </h3>
                <div className="space-y-3">
                  {analysis.topThreeKillers.map((killer, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-200 text-red-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-red-800 leading-relaxed">{killer}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Wins */}
              <div className="rounded-2xl bg-green-50 border border-green-200 p-6">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-green-700 mb-4">
                  ⚡ Quick Wins — Highest ROI Fixes
                </h3>
                <div className="space-y-3">
                  {analysis.quickWins.map((win, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-200 text-green-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-green-800 leading-relaxed">{win}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score Overview Bar */}
              <div className="rounded-2xl bg-white border border-choco-100 p-6 shadow-soft">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-choco-500 mb-4">
                  Score Breakdown
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Brand Clarity",        score: analysis.brandClarity.score        },
                    { label: "Engagement Quality",    score: analysis.engagementQuality.score    },
                    { label: "Content Consistency",   score: analysis.contentConsistency.score   },
                    { label: "Human Readability",     score: analysis.humanReadability.score     },
                    { label: "AI Readability",        score: analysis.aiReadability.score        },
                    { label: "Website Match",         score: analysis.websiteMatch.score         },
                  ].map(({ label, score }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-choco-600 w-36 shrink-0">{label}</span>
                      <div className="flex-1 bg-choco-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${getScoreBarColor(score)}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold tabular-nums w-8 text-right ${getScoreColor(score)}`}>
                        {score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metric Cards */}
              <MetricCard label="Metric 1 of 6" title="Brand Clarity" metric={analysis.brandClarity} />
              <MetricCard label="Metric 2 of 6" title="Engagement Quality" metric={analysis.engagementQuality} />
              <MetricCard label="Metric 3 of 6" title="Content Consistency" metric={analysis.contentConsistency} />

              {/* Human Readability */}
              <div className="rounded-2xl bg-white p-6 shadow-soft border border-choco-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-choco-400 mb-0.5">Metric 4 of 6</p>
                    <h3 className="text-base font-semibold text-choco-900">Human Readability</h3>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className={`text-2xl font-bold tabular-nums ${getScoreColor(analysis.humanReadability.score)}`}>
                      {analysis.humanReadability.score}<span className="text-sm font-normal text-choco-400">/100</span>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getRatingBadgeClass(analysis.humanReadability.rating)}`}>
                      {analysis.humanReadability.rating}
                    </span>
                  </div>
                </div>
                <ScoreBar score={analysis.humanReadability.score} />
                <p className="text-sm text-choco-700 mt-4 mb-4 leading-relaxed">{analysis.humanReadability.summary}</p>

                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  <div className="rounded-xl bg-cream-50 border border-choco-100 p-4">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-500 mb-2">⏱ 5-Second Test</h4>
                    <p className="text-xs text-choco-700 leading-relaxed">{analysis.humanReadability.fiveSecondTest}</p>
                  </div>
                  <div className="rounded-xl bg-cream-50 border border-choco-100 p-4">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-500 mb-2">🧒 5th Grader Test</h4>
                    <p className="text-xs text-choco-700 leading-relaxed">{analysis.humanReadability.fifthGraderTest}</p>
                  </div>
                  <div className="rounded-xl bg-cream-50 border border-choco-100 p-4">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-500 mb-2">💡 Value Proposition</h4>
                    <p className="text-xs text-choco-700 leading-relaxed">{analysis.humanReadability.valuePropositionClarity}</p>
                  </div>
                  <div className="rounded-xl bg-cream-50 border border-choco-100 p-4">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-500 mb-2">❤️ Emotional Resonance</h4>
                    <p className="text-xs text-choco-700 leading-relaxed">{analysis.humanReadability.emotionalResonance}</p>
                  </div>
                </div>

                {analysis.humanReadability.jargonDetected.length > 0 && (
                  <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 mb-4">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-600 mb-2">Jargon Detected</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.humanReadability.jargonDetected.map((j, i) => (
                        <span key={i} className="rounded-full bg-orange-100 text-orange-700 text-[11px] px-2.5 py-0.5 ring-1 ring-orange-200">
                          {j}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-choco-800 p-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-300 mb-2">Recommendations</h4>
                  <p className="text-xs text-cream-100 leading-relaxed">{analysis.humanReadability.recommendations}</p>
                </div>
              </div>

              {/* AI Readability */}
              <div className="rounded-2xl bg-white p-6 shadow-soft border border-choco-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-choco-400 mb-0.5">Metric 5 of 6</p>
                    <h3 className="text-base font-semibold text-choco-900">AI Readability</h3>
                    <p className="text-[11px] text-choco-400 mt-0.5">How LLMs, search engines & AI assistants parse your brand</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className={`text-2xl font-bold tabular-nums ${getScoreColor(analysis.aiReadability.score)}`}>
                      {analysis.aiReadability.score}<span className="text-sm font-normal text-choco-400">/100</span>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getRatingBadgeClass(analysis.aiReadability.rating)}`}>
                      {analysis.aiReadability.rating}
                    </span>
                  </div>
                </div>
                <ScoreBar score={analysis.aiReadability.score} />
                <p className="text-sm text-choco-700 mt-4 mb-4 leading-relaxed">{analysis.aiReadability.summary}</p>

                {/* Entity Extraction */}
                <div className="rounded-xl bg-cream-50 border border-choco-100 p-4 mb-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-500 mb-3">
                    Entity Extraction — What AI Can Parse
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(Object.entries(analysis.aiReadability.entityExtraction) as [string, string | null][]).map(
                      ([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                          <span className="text-[10px] text-choco-400 uppercase tracking-wide w-28 shrink-0 mt-0.5">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className={`text-xs font-medium ${value ? "text-choco-800" : "text-red-500 italic"}`}>
                            {value ?? "— not extractable"}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {[
                    { label: "Structured Data Readiness", value: analysis.aiReadability.structuredDataReadiness },
                    { label: "Search Intent Alignment",   value: analysis.aiReadability.searchIntentAlignment   },
                    { label: "LLM Indexability",          value: analysis.aiReadability.llmIndexability          },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-cream-50 border border-choco-100 p-4">
                      <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-500 mb-1.5">{label}</h4>
                      <p className="text-xs text-choco-700 leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-choco-800 p-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-300 mb-2">Recommendations</h4>
                  <p className="text-xs text-cream-100 leading-relaxed">{analysis.aiReadability.recommendations}</p>
                </div>
              </div>

              {/* Website Match */}
              <div className="rounded-2xl bg-white p-6 shadow-soft border border-choco-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-choco-400 mb-0.5">Metric 6 of 6</p>
                    <h3 className="text-base font-semibold text-choco-900">Website vs. Brand Match</h3>
                    <p className="text-[11px] text-choco-400 mt-0.5">
                      {analysis.websiteMatch.websiteScraped
                        ? "✅ Website scanned successfully"
                        : formData.websiteUrl
                        ? "⚠️ Website could not be reached"
                        : "ℹ️ No website provided"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className={`text-2xl font-bold tabular-nums ${getScoreColor(analysis.websiteMatch.score)}`}>
                      {analysis.websiteMatch.score}<span className="text-sm font-normal text-choco-400">/100</span>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getRatingBadgeClass(analysis.websiteMatch.rating)}`}>
                      {analysis.websiteMatch.rating}
                    </span>
                  </div>
                </div>
                <ScoreBar score={analysis.websiteMatch.score} />
                <p className="text-sm text-choco-700 mt-4 mb-4 leading-relaxed">{analysis.websiteMatch.summary}</p>

                {analysis.websiteMatch.websiteRedFlags.length > 0 && (
                  <div className="rounded-xl bg-red-50 border border-red-100 p-4 mb-4">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-600 mb-2">🚩 Website Red Flags</h4>
                    <ul className="space-y-1.5">
                      {analysis.websiteMatch.websiteRedFlags.map((flag, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-red-700">
                          <span className="shrink-0 mt-0.5">→</span><span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  {[
                    { label: "Hero Message Match",      value: analysis.websiteMatch.heroMessageMatch      },
                    { label: "Audience Signal Match",   value: analysis.websiteMatch.audienceSignalMatch   },
                    { label: "Brand Voice Consistency", value: analysis.websiteMatch.brandVoiceConsistency },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-cream-50 border border-choco-100 p-4">
                      <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-500 mb-1.5">{label}</h4>
                      <p className="text-xs text-choco-700 leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>

                {analysis.websiteMatch.missingOnWebsite.length > 0 && (
                  <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 mb-4">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-600 mb-2">
                      Missing From Website
                    </h4>
                    <ul className="space-y-1.5">
                      {analysis.websiteMatch.missingOnWebsite.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-orange-700">
                          <span className="shrink-0 mt-0.5">•</span><span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-xl bg-choco-800 p-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-choco-300 mb-2">Recommendations</h4>
                  <p className="text-xs text-cream-100 leading-relaxed">{analysis.websiteMatch.recommendations}</p>
                </div>
              </div>

              {/* Platform Specific */}
              {Object.keys(analysis.platformSpecific).length > 0 && (
                <div className="rounded-2xl bg-white p-6 shadow-soft border border-choco-100">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-choco-500 mb-4">
                    Platform-Specific Risks
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(analysis.platformSpecific).map(([platform, insight]) => (
                      <div key={platform} className="rounded-xl bg-cream-50 border border-choco-100 p-4">
                        <h5 className="text-xs font-semibold text-choco-800 capitalize mb-1.5">{platform}</h5>
                        <p className="text-xs text-choco-600 leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Run Again */}
              <button
                onClick={resetForm}
                className="w-full rounded-xl border-2 border-choco-800 bg-transparent px-6 py-3 text-sm font-medium text-choco-800 hover:bg-choco-800 hover:text-cream-50 focus:outline-none focus:ring-2 focus:ring-choco-500 focus:ring-offset-2 transition-all"
              >
                Run New Analysis
              </button>

            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}