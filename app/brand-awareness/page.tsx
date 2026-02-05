"use client";

import { useState } from "react";
import { Navbar, SiteFooter } from "@ariclear/components";

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
  platforms: PlatformData;
};

type MetricAnalysis = {
  score: number;
  rating: "Excellent" | "Good" | "Needs Work";
  summary: string;
  insights: string[];
  recommendations: string;
};

type AnalysisResult = {
  overallScore: number;
  brandClarity: MetricAnalysis;
  engagementQuality: MetricAnalysis;
  contentConsistency: MetricAnalysis;
  platformSpecific: Record<string, string>;
};

export default function BrandAwarenessPage() {
  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    businessDescription: "",
    targetAudience: "",
    platforms: {},
  });

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePlatformChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [name]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/brand-awareness/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const result = await response.json();
      setAnalysis(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Analysis error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to analyze brand awareness"
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      businessName: "",
      businessDescription: "",
      targetAudience: "",
      platforms: {},
    });
    setAnalysis(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getRatingBadgeClass = (rating: string) => {
    if (rating === "Excellent") {
      return "bg-green-100 text-green-700 ring-green-300";
    }
    if (rating === "Good") {
      return "bg-yellow-100 text-yellow-700 ring-yellow-300";
    }
    return "bg-red-100 text-red-700 ring-red-300";
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-cream-50">
        {/* Header */}
        <div className="border-b border-choco-100 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-choco-500">
                  Brand Analysis
                </p>
                <h1 className="mt-1 text-2xl font-bold text-choco-900">
                  Brand Awareness Evaluator
                </h1>
              </div>
              <div className="text-right">
                <p className="text-xs text-choco-600">AI-Powered Analysis</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {!analysis ? (
            <>
              {/* Introduction */}
              <div className="mb-8 text-center">
                <p className="text-sm text-choco-600">
                  Understand how well humans comprehend your business and
                  evaluate your brand awareness across all social media
                  platforms.
                </p>
              </div>

              {/* Form */}
              <div className="rounded-2xl bg-white p-6 shadow-soft border border-choco-100 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-[0.12em] text-choco-600 mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      required
                      value={formData.businessName}
                      onChange={handleInputChange}
                      placeholder="Enter your business name"
                      className="w-full rounded-full border border-choco-200 bg-cream-50 px-4 py-3 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-2 focus:ring-choco-500/20"
                    />
                  </div>

                  {/* Business Description */}
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-[0.12em] text-choco-600 mb-2">
                      What Does Your Business Do?
                    </label>
                    <textarea
                      name="businessDescription"
                      required
                      value={formData.businessDescription}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Briefly describe your business, products, or services..."
                      className="w-full rounded-2xl border border-choco-200 bg-cream-50 px-4 py-3 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-2 focus:ring-choco-500/20"
                    />
                  </div>

                  {/* Target Audience */}
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-[0.12em] text-choco-600 mb-2">
                      Target Audience
                    </label>
                    <input
                      type="text"
                      name="targetAudience"
                      required
                      value={formData.targetAudience}
                      onChange={handleInputChange}
                      placeholder="Who are your ideal customers? (e.g., young professionals, small business owners)"
                      className="w-full rounded-full border border-choco-200 bg-cream-50 px-4 py-3 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-2 focus:ring-choco-500/20"
                    />
                  </div>

                  {/* Social Media Platforms */}
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-[0.12em] text-choco-600 mb-3">
                      Social Media Profiles
                    </label>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          { name: "instagram", label: "Instagram" },
                          { name: "facebook", label: "Facebook" },
                          { name: "twitter", label: "Twitter/X" },
                          { name: "linkedin", label: "LinkedIn" },
                          { name: "tiktok", label: "TikTok" },
                          { name: "youtube", label: "YouTube" },
                        ].map((platform) => (
                          <div key={platform.name}>
                            <label className="block text-xs text-choco-500 mb-1">
                              {platform.label}
                            </label>
                            <input
                              type="text"
                              name={platform.name}
                              value={
                                formData.platforms[
                                  platform.name as keyof PlatformData
                                ] || ""
                              }
                              onChange={handlePlatformChange}
                              placeholder="@username or URL"
                              className="w-full rounded-full border border-choco-200 bg-cream-50 px-4 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-2 focus:ring-choco-500/20"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-choco-800 px-6 py-3 text-sm font-medium text-cream-50 hover:bg-choco-900 focus:outline-none focus:ring-2 focus:ring-choco-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? "Analyzing..." : "Analyze Brand Awareness"}
                  </button>
                </form>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="mt-8 rounded-2xl bg-white p-12 shadow-soft border border-choco-100 text-center">
                  <div className="w-12 h-12 border-4 border-choco-200 border-t-choco-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold text-choco-900 mb-2">
                    Analyzing Your Brand Presence...
                  </h3>
                  <p className="text-sm text-choco-600">
                    Evaluating clarity, engagement, and consistency across
                    platforms
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Report Section */
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center mb-8">
                <p className="text-[11px] uppercase tracking-[0.16em] text-choco-500 mb-2">
                  Analysis Complete
                </p>
                <h2 className="text-2xl font-bold text-choco-900 mb-4">
                  {formData.businessName}
                </h2>
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-linear-to-br from-choco-100 to-cream-100 border-4 border-choco-500 shadow-soft-lg mb-4">
                  <span className="text-4xl font-bold text-choco-900">
                    {analysis.overallScore}
                  </span>
                </div>
                <p className="text-sm text-choco-600">
                  Overall Brand Awareness Score
                </p>
              </div>

              {/* Brand Clarity */}
              <div className="rounded-2xl bg-white p-6 shadow-soft border border-choco-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-choco-500 mb-1">
                      Metric
                    </p>
                    <h3 className="text-lg font-semibold text-choco-900">
                      Brand Clarity
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-choco-900 mb-1">
                      {analysis.brandClarity.score}/100
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getRatingBadgeClass(
                        analysis.brandClarity.rating
                      )}`}
                    >
                      {analysis.brandClarity.rating}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-choco-700 mb-4 leading-relaxed">
                  {analysis.brandClarity.summary}
                </p>

                <div className="rounded-xl bg-cream-50 border border-choco-100 p-4 mb-4">
                  <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600 mb-3">
                    Key Insights
                  </h4>
                  <ul className="space-y-2">
                    {analysis.brandClarity.insights.map((insight, idx) => (
                      <li
                        key={idx}
                        className="flex items-start text-xs text-choco-700"
                      >
                        <span className="text-choco-500 mr-2">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-choco-800 p-4">
                  <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300 mb-2">
                    Recommendations
                  </h4>
                  <p className="text-xs text-cream-100 leading-relaxed">
                    {analysis.brandClarity.recommendations}
                  </p>
                </div>
              </div>

              {/* Engagement Quality */}
              <div className="rounded-2xl bg-white p-6 shadow-soft border border-choco-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-choco-500 mb-1">
                      Metric
                    </p>
                    <h3 className="text-lg font-semibold text-choco-900">
                      Engagement Quality
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-choco-900 mb-1">
                      {analysis.engagementQuality.score}/100
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getRatingBadgeClass(
                        analysis.engagementQuality.rating
                      )}`}
                    >
                      {analysis.engagementQuality.rating}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-choco-700 mb-4 leading-relaxed">
                  {analysis.engagementQuality.summary}
                </p>

                <div className="rounded-xl bg-cream-50 border border-choco-100 p-4 mb-4">
                  <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600 mb-3">
                    Key Insights
                  </h4>
                  <ul className="space-y-2">
                    {analysis.engagementQuality.insights.map((insight, idx) => (
                      <li
                        key={idx}
                        className="flex items-start text-xs text-choco-700"
                      >
                        <span className="text-choco-500 mr-2">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-choco-800 p-4">
                  <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300 mb-2">
                    Recommendations
                  </h4>
                  <p className="text-xs text-cream-100 leading-relaxed">
                    {analysis.engagementQuality.recommendations}
                  </p>
                </div>
              </div>

              {/* Content Consistency */}
              <div className="rounded-2xl bg-white p-6 shadow-soft border border-choco-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-choco-500 mb-1">
                      Metric
                    </p>
                    <h3 className="text-lg font-semibold text-choco-900">
                      Content Consistency
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-choco-900 mb-1">
                      {analysis.contentConsistency.score}/100
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getRatingBadgeClass(
                        analysis.contentConsistency.rating
                      )}`}
                    >
                      {analysis.contentConsistency.rating}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-choco-700 mb-4 leading-relaxed">
                  {analysis.contentConsistency.summary}
                </p>

                <div className="rounded-xl bg-cream-50 border border-choco-100 p-4 mb-4">
                  <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600 mb-3">
                    Key Insights
                  </h4>
                  <ul className="space-y-2">
                    {analysis.contentConsistency.insights.map((insight, idx) => (
                      <li
                        key={idx}
                        className="flex items-start text-xs text-choco-700"
                      >
                        <span className="text-choco-500 mr-2">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl bg-choco-800 p-4">
                  <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300 mb-2">
                    Recommendations
                  </h4>
                  <p className="text-xs text-cream-100 leading-relaxed">
                    {analysis.contentConsistency.recommendations}
                  </p>
                </div>
              </div>

              {/* Platform-Specific Insights */}
              {Object.keys(analysis.platformSpecific).length > 0 && (
                <div className="rounded-2xl bg-white p-6 shadow-soft border border-choco-100">
                  <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600 mb-4">
                    Platform-Specific Insights
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Object.entries(analysis.platformSpecific).map(
                      ([platform, insight]) => (
                        <div
                          key={platform}
                          className="rounded-xl bg-cream-50 border border-choco-100 p-4"
                        >
                          <h5 className="text-sm font-semibold text-choco-800 mb-2 capitalize">
                            {platform}
                          </h5>
                          <p className="text-xs text-choco-600 leading-relaxed">
                            {insight}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* New Analysis Button */}
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