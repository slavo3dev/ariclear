// src/app/scan/page.tsx
"use client";

import { useState } from "react";
import { Navbar, SiteFooter, Button } from "@ariclear/components";
import { usePreorder } from "@ariclear/components/providers/PreorderProvider";

type AnalyzeResponse = {
  human?: {
    clarityScore?: number;
    whatItSeemsLike?: string;
    confusions?: string[];
  };
  ai?: {
    aiSeoScore?: number;
    aiSummary?: string;
    missingKeywords?: string[];
  };
  copy?: {
    suggestedHeadline?: string;
    suggestedSubheadline?: string;
    suggestedCTA?: string;
  };
  error?: string;
};

export default function ScanPage() {
  const [targetUrl, setTargetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const { open } = usePreorder();

  const onAnalyze = async () => {
    if (!targetUrl) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const json = (await res.json()) as AnalyzeResponse;

      if (!res.ok) {
        setResult({ error: json?.error || "Analysis failed" });
      } else {
        setResult(json);
      }
    } catch (e) {
      setResult({ error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-cream-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold text-choco-900">
            AriClear Demo
          </h1>
          <p className="mt-2 text-sm text-choco-700">
            Paste a homepage URL. AriClear will test if humans understand it in
            ~10 seconds, and if AI can read it for AI SEO.
          </p>

          <div className="mt-6 rounded-2xl border border-choco-100 bg-white/80 p-4 shadow-soft">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
              Homepage URL
            </label>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-full border border-choco-200 bg-cream-50 px-4 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-1 focus:ring-choco-500"
              />
              <Button
                type="button"
                className="shrink-0 sm:px-6"
                disabled={loading}
                onClick={onAnalyze}
              >
                {loading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>

            <p className="mt-2 text-[11px] text-choco-500">
              Demo mode: we’ll analyze public pages only. Private pages/login
              walls won’t work yet.
            </p>
          </div>

          {/* Results */}
          {result && (
            <div className="mt-6 space-y-4">
              {result.error ? (
                <div className="rounded-2xl border border-choco-200 bg-white p-4 text-sm text-choco-800">
                  ⚠️ {result.error}
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-choco-100 bg-white p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
                        Human clarity
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-choco-900">
                        {result.human?.clarityScore ?? "--"} / 100
                      </p>
                      <p className="mt-2 text-sm text-choco-700">
                        {result.human?.whatItSeemsLike ?? ""}
                      </p>
                      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-choco-700">
                        {(result.human?.confusions ?? []).map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-choco-100 bg-white p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
                        AI SEO comprehension
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-choco-900">
                        {result.ai?.aiSeoScore ?? "--"} / 100
                      </p>
                      <p className="mt-2 text-sm text-choco-700">
                        {result.ai?.aiSummary ?? ""}
                      </p>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {(result.ai?.missingKeywords ?? []).map((k) => (
                          <span
                            key={k}
                            className="rounded-full bg-cream-50 px-3 py-1 text-[11px] text-choco-700 ring-1 ring-choco-100"
                          >
                            {k}
                          </span>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-choco-100 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
                      Suggested hero copy
                    </p>
                    <p className="mt-2 text-lg font-semibold text-choco-900">
                      {result.copy?.suggestedHeadline ?? ""}
                    </p>
                    <p className="mt-1 text-sm text-choco-700">
                      {result.copy?.suggestedSubheadline ?? ""}
                    </p>
                    <div className="mt-3 inline-flex rounded-full bg-choco-900 px-4 py-2 text-[11px] font-medium text-cream-50" onClick={open}>
                      {result.copy?.suggestedCTA ?? ""}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
