"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar, SiteFooter, Button, usePreorder, useAuth, AuthModal } from "@ariclear/components";

type AnalyzeResponse = {
  human?: {
    clarityScore?: number;
    whatItSeemsLike?: string;
    oneSentenceValueProp?: string;
    bestGuessAudience?: string;
    confusions?: string[];
    topIssues?: { issue: string; whyItHurts: string; fix: string }[];
  };
  ai?: {
    aiSeoScore?: number;
    aiSummary?: string;
    indexerRead?: string;
    missingKeywords?: string[];
    structuredDataSuggestions?: string[];
  };
  copy?: {
    suggestedHeadline?: string;
    suggestedSubheadline?: string;
    suggestedCTA?: string;
  };
  plan?: {
    nextSteps?: {
      title: string;
      impact: "high" | "medium" | "low";
      effort: "low" | "medium" | "high";
      details: string;
    }[];
  };
  prompts?: {
    aiSeoPrompt?: string;
  };
  error?: string;
};

function isValidHttpUrl(input: string) {
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-cream-50 px-3 py-1 text-[11px] text-choco-700 ring-1 ring-choco-100">
      {label}
    </span>
  );
}

function Pill({ value }: { value: "high" | "medium" | "low" }) {
  const cls =
    value === "high"
      ? "bg-choco-900 text-cream-50"
      : value === "medium"
      ? "bg-cream-100 text-choco-900 ring-1 ring-choco-200"
      : "bg-white text-choco-700 ring-1 ring-choco-200";

  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${cls}`}>{value}</span>;
}

export default function ScanPage() {
  const router = useRouter();
  const { open: openPreorder } = usePreorder();
  const { user, loading: authLoading } = useAuth();

  const [authOpen, setAuthOpen] = useState(false);

  const [targetUrl, setTargetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const cleanedUrl = useMemo(() => targetUrl.trim(), [targetUrl]);
  const canAnalyze = useMemo(
    () => !!cleanedUrl && isValidHttpUrl(cleanedUrl) && !loading,
    [cleanedUrl, loading],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) setAuthOpen(true);
  }, [authLoading, user]);

  const closeAuth = () => {
    setAuthOpen(false);
    if (!user) router.push("/");
  };

  const onAnalyze = async () => {
    if (!canAnalyze) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanedUrl }),
      });

      const json = (await res.json()) as AnalyzeResponse;

      if (!res.ok) setResult({ error: json?.error || "Analysis failed" });
      else setResult(json);
    } catch {
      setResult({ error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <AuthModal open={authOpen} onClose={closeAuth} initialMode="login" />

      <main className="flex-1 bg-cream-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold text-choco-900">AriClear Demo</h1>
          <p className="mt-2 text-sm text-choco-700">
            AriClear simulates a <span className="font-medium">10-second human scan</span> and an{" "}
            <span className="font-medium">AI/indexer read</span> of your homepage — then tells you exactly what to fix first.
          </p>

          {authLoading ? (
            <div className="mt-6 rounded-2xl border border-choco-100 bg-white/80 p-4 shadow-soft">
              <p className="text-sm text-choco-700">Checking your session…</p>
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl border border-choco-100 bg-white/80 p-4 shadow-soft">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
              Homepage URL
            </label>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                inputMode="url"
                className="w-full rounded-full border border-choco-200 bg-cream-50 px-4 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-1 focus:ring-choco-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onAnalyze();
                }}
              />

              <Button
                type="button"
                className="shrink-0 sm:px-6"
                disabled={!canAnalyze || !user || authLoading}
                onClick={onAnalyze}
              >
                {loading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>

            {!cleanedUrl ? (
              <p className="mt-2 text-[11px] text-choco-500">Tip: use your homepage URL (not a login page).</p>
            ) : !isValidHttpUrl(cleanedUrl) ? (
              <p className="mt-2 text-[11px] text-red-700">Please enter a valid URL starting with http:// or https://</p>
            ) : (
              <p className="mt-2 text-[11px] text-choco-500">
                Demo mode: public pages only. Login walls may not work.
              </p>
            )}
          </div>

          {result && (
            <div className="mt-6 space-y-4">
              {result.error ? (
                <div className="rounded-2xl border border-choco-200 bg-white p-4 text-sm text-choco-800">
                  ⚠️ {result.error}
                </div>
              ) : (
                <>
                  {/* Scores */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-choco-100 bg-white p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">Human clarity</p>
                      <p className="mt-2 text-2xl font-semibold text-choco-900">
                        {result.human?.clarityScore ?? "--"} / 100
                      </p>
                      <p className="mt-2 text-sm text-choco-700">{result.human?.whatItSeemsLike ?? ""}</p>

                      <div className="mt-4 rounded-xl bg-cream-50 p-3 ring-1 ring-choco-100">
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-choco-600">
                          What it should communicate in one sentence
                        </p>
                        <p className="mt-1 text-sm font-medium text-choco-900">
                          {result.human?.oneSentenceValueProp ?? ""}
                        </p>
                        <p className="mt-1 text-[11px] text-choco-600">
                          Best-guess audience: <span className="font-medium">{result.human?.bestGuessAudience ?? ""}</span>
                        </p>
                      </div>

                      <ul className="mt-4 list-disc space-y-1 pl-4 text-xs text-choco-700">
                        {(result.human?.confusions ?? []).map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-choco-100 bg-white p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">AI comprehension</p>
                      <p className="mt-2 text-2xl font-semibold text-choco-900">
                        {result.ai?.aiSeoScore ?? "--"} / 100
                      </p>
                      <p className="mt-2 text-sm text-choco-700">{result.ai?.aiSummary ?? ""}</p>

                      <div className="mt-4 rounded-xl bg-cream-50 p-3 ring-1 ring-choco-100">
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-choco-600">
                          How an AI indexer reads your site
                        </p>
                        <p className="mt-1 text-sm text-choco-900">{result.ai?.indexerRead ?? ""}</p>
                      </div>

                      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-choco-600">
                        Missing / unclear keywords
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(result.ai?.missingKeywords ?? []).map((k) => (
                          <Badge key={k} label={k} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Top issues (why + fix) */}
                  <div className="rounded-2xl border border-choco-100 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
                      Priority issues (what to fix first)
                    </p>

                    <div className="mt-4 space-y-3">
                      {(result.human?.topIssues ?? []).map((item, idx) => (
                        <div key={`${item.issue}-${idx}`} className="rounded-xl bg-cream-50 p-4 ring-1 ring-choco-100">
                          <p className="text-sm font-semibold text-choco-900">
                            {idx + 1}. {item.issue}
                          </p>
                          <p className="mt-1 text-xs text-choco-700">
                            <span className="font-medium text-choco-900">Why it hurts:</span> {item.whyItHurts}
                          </p>
                          <p className="mt-2 text-xs text-choco-700">
                            <span className="font-medium text-choco-900">Fix:</span> {item.fix}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested hero copy */}
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

                    <button
                      type="button"
                      onClick={openPreorder}
                      className="mt-3 inline-flex items-center rounded-full bg-choco-900 px-4 py-2 text-[11px] font-medium text-cream-50 transition hover:bg-choco-800 focus:outline-none focus:ring-2 focus:ring-choco-400"
                    >
                      {result.copy?.suggestedCTA ?? "Get early access"}
                    </button>

                    <p className="mt-2 text-[11px] text-choco-500">
                      Want a full report (hero + sections + FAQs + metadata + schema)? Join early access.
                    </p>
                  </div>

                  {/* Action Plan */}
                  <div className="rounded-2xl border border-choco-100 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
                      Action plan (do these in order)
                    </p>

                    <div className="mt-4 space-y-3">
                      {(result.plan?.nextSteps ?? []).map((s, idx) => (
                        <div key={`${s.title}-${idx}`} className="rounded-xl bg-cream-50 p-4 ring-1 ring-choco-100">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-choco-900">
                              {idx + 1}. {s.title}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-choco-600">impact</span>
                                <Pill value={s.impact} />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-choco-600">effort</span>
                                <Pill value={s.effort} />
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-choco-700">{s.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Technical AI-SEO suggestions */}
                  <div className="rounded-2xl border border-choco-100 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
                      AI-SEO quick wins (technical)
                    </p>
                    <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-choco-700">
                      {(result.ai?.structuredDataSuggestions ?? []).map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Prompt */}
                  {result.prompts?.aiSeoPrompt ? (
                    <div className="rounded-2xl border border-choco-100 bg-white p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
                          Copy/paste prompt (use with any AI)
                        </p>
                        <Button
                          type="button"
                          className="px-3 py-1.5 text-xs"
                          onClick={() => copyToClipboard(result.prompts?.aiSeoPrompt ?? "")}
                        >
                          Copy prompt
                        </Button>
                      </div>

                      <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-cream-50 p-4 text-[12px] leading-relaxed text-choco-800 ring-1 ring-choco-100">
                        {result.prompts.aiSeoPrompt}
                      </pre>
                      <p className="mt-2 text-[11px] text-choco-500">
                        This prompt helps you rewrite your hero + meta description + headings so humans and AI understand you.
                      </p>
                    </div>
                  ) : null}
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
