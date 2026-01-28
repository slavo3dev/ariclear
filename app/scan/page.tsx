// src/app/scan/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Navbar,
  SiteFooter,
  Button,
  usePreorder,
  useAuth,
  AuthModal,
  ScanResultsEnhanced
} from "@ariclear/components";

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

function LoadingDots({ step }: { step: number }) {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={[
            "inline-block h-1.5 w-1.5 rounded-full transition-all duration-300",
            step % 3 === i
              ? "bg-choco-300 scale-125"
              : "bg-choco-600/60 scale-90",
          ].join(" ")}
        />
      ))}
    </span>
  );
}

function AriAnalyzingOverlay({ url }: { url: string }) {
  const steps = useMemo(
    () => [
      {
        label: "Human scan",
        status: "Sniffing your hero message",
        quote: {
          text: "The first battle is won or lost in the opening moment.",
          by: "Samurai principle",
        },
      },
      {
        label: "10-second test",
        status: "Testing what humans understand in 10 seconds",
        quote: {
          text: "If it is not clear, it is not yet true.",
          by: "AriClear mantra",
        },
      },
      {
        label: "AI read",
        status: "Reading headings like an AI indexer",
        quote: {
          text: "To know the path ahead, ask those coming back.",
          by: "Japanese proverb",
        },
      },
      {
        label: "Keywords",
        status: "Identifying missing context and keywords",
        quote: {
          text: "Victory comes from seeing what others do not.",
          by: "Miyamoto Musashi (paraphrase)",
        },
      },
      {
        label: "Plan",
        status: "Forming a clear plan of action",
        quote: {
          text: "Perceive that which cannot be seen with the eye.",
          by: "Miyamoto Musashi",
        },
      },
    ],
    [],
  );

  const STEP_DURATION = 2200;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      setStep((v) => (v < steps.length - 1 ? v + 1 : v));
    }, STEP_DURATION);

    return () => window.clearInterval(t);
  }, [steps.length]);

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-choco-900/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-3xl bg-choco-900 p-6 shadow-2xl ring-1 ring-choco-700">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 animate-pulse rounded-full bg-choco-800/40" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-choco-400/70 [animation-duration:2.6s]" />
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-choco-800 shadow-soft">
              <Image
                src="/branding/arilogo-optimized.png"
                alt="AriClear"
                fill
                priority
                sizes="80px"
                className="object-contain p-2"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-full bg-choco-800 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-choco-200">
            Ari is sniffing <LoadingDots step={step} />
          </div>

          <p className="mt-3 text-sm font-medium text-cream-50">
            {current.status}
          </p>

          {url && (
            <p className="mt-1 max-w-full truncate text-[11px] text-choco-300">
              {url}
            </p>
          )}

          <div className="mt-4 w-full">
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={[
                    "h-2 flex-1 rounded-full transition-all",
                    i < step
                      ? "bg-choco-400"
                      : i === step
                      ? "bg-choco-700"
                      : "bg-choco-800",
                  ].join(" ")}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-choco-400">
              <span>{current.label}</span>
              <span>
                {step + 1}/{steps.length}
              </span>
            </div>
          </div>

          <div className="mt-5 w-full rounded-2xl bg-choco-800/60 p-4 ring-1 ring-choco-700">
            <p className="text-[12px] leading-relaxed text-cream-100">
              &quot;{current.quote.text}&quot;
            </p>
            <p className="mt-2 text-[11px] text-choco-300">
              — {current.quote.by}
            </p>
          </div>

          <p className="mt-3 text-[11px] text-choco-300">
            Calm analysis. No rushing. Clarity takes discipline.
          </p>
        </div>
      </div>
    </div>
  );
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

  // Transform API result to enhanced format with smart categorization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformToEnhancedResult = (apiResult: AnalyzeResponse): any => {
    const humanScore = apiResult.human?.clarityScore ?? 0;
    const aiScore = apiResult.ai?.aiSeoScore ?? 0;
    const combinedScore = Math.round((humanScore + aiScore) / 2);

    // Smart categorization based on issue content
    const categorizeIssue = (issueText: string): 'security' | 'privacy' | 'performance' | 'accessibility' => {
      const text = issueText.toLowerCase();
      
      if (text.includes('speed') || text.includes('load') || text.includes('performance') || 
          text.includes('slow') || text.includes('fast') || text.includes('image') ||
          text.includes('optimize') || text.includes('cache') || text.includes('seo') ||
          text.includes('keyword')) {
        return 'performance';
      }
      
      if (text.includes('privacy') || text.includes('gdpr') || text.includes('cookie') ||
          text.includes('tracking') || text.includes('data') || text.includes('consent') ||
          text.includes('analytics')) {
        return 'privacy';
      }
      
      if (text.includes('security') || text.includes('ssl') || text.includes('https') ||
          text.includes('encrypt') || text.includes('password') || text.includes('auth')) {
        return 'security';
      }
      
      if (text.includes('clear') || text.includes('confus') || text.includes('understand') ||
          text.includes('message') || text.includes('headline') || text.includes('value prop') ||
          text.includes('benefit') || text.includes('audience') || text.includes('cta') ||
          text.includes('call to action') || text.includes('unclear') || text.includes('vague')) {
        return 'accessibility';
      }
      
      return 'accessibility';
    };

    const issues = (apiResult.human?.topIssues ?? []).map((issue, idx) => {
      const category = categorizeIssue(issue.issue + ' ' + issue.whyItHurts);
      
      return {
        id: `issue-${idx}`,
        category,
        severity: idx === 0 ? 'critical' as const : 
                  idx === 1 ? 'high' as const : 
                  idx === 2 ? 'medium' as const : 'low' as const,
        title: issue.issue,
        description: issue.whyItHurts,
        impact: issue.fix,
        fixed: false,
      };
    });

    const suggestions = (apiResult.plan?.nextSteps ?? []).map((step, idx) => ({
      id: `suggestion-${idx}`,
      title: step.title,
      description: step.details,
      priority: step.impact,
      estimatedTime: step.effort === 'low' ? '1-2 hours' : 
                     step.effort === 'medium' ? '2-4 hours' : '4-8 hours',
      resources: [],
    }));

    if (apiResult.ai?.structuredDataSuggestions) {
      apiResult.ai.structuredDataSuggestions.forEach((suggestion, idx) => {
        suggestions.push({
          id: `ai-suggestion-${idx}`,
          title: suggestion.length > 50 ? suggestion.substring(0, 50) + '...' : suggestion,
          description: suggestion,
          priority: 'medium' as const,
          estimatedTime: '2-3 hours',
          resources: [],
        });
      });
    }

    return {
      score: combinedScore,
      metadata: {
        scannedAt: new Date().toISOString(),
        url: cleanedUrl,
        domain: new URL(cleanedUrl).hostname,
      },
      issues,
      suggestions,
      rawData: {
        humanClarity: {
          score: humanScore,
          whatItSeemsLike: apiResult.human?.whatItSeemsLike,
          oneSentenceValueProp: apiResult.human?.oneSentenceValueProp,
          bestGuessAudience: apiResult.human?.bestGuessAudience,
          confusions: apiResult.human?.confusions,
        },
        aiComprehension: {
          score: aiScore,
          aiSummary: apiResult.ai?.aiSummary,
          indexerRead: apiResult.ai?.indexerRead,
          missingKeywords: apiResult.ai?.missingKeywords,
        },
        suggestedCopy: {
          headline: apiResult.copy?.suggestedHeadline,
          subheadline: apiResult.copy?.suggestedSubheadline,
          cta: apiResult.copy?.suggestedCTA,
        },
        actionPlan: apiResult.plan?.nextSteps,
        prompt: apiResult.prompts?.aiSeoPrompt,
      },
    };
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <AuthModal open={authOpen} onClose={closeAuth} initialMode="login" />

      {loading ? <AriAnalyzingOverlay url={cleanedUrl} /> : null}

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
                disabled={loading}
                className="w-full rounded-full border border-choco-200 bg-cream-50 px-4 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-1 focus:ring-choco-500 disabled:opacity-60"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onAnalyze();
                }}
              />

              <Button
                type="button"
                className="shrink-0 sm:px-6"
                disabled={!canAnalyze || !user || authLoading || loading}
                onClick={onAnalyze}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    Analyzing <span className="opacity-90">•</span>
                  </span>
                ) : (
                  "Analyze"
                )}
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
            <>
              {result.error ? (
                <div className="mt-6 rounded-2xl border border-choco-200 bg-white p-4 text-sm text-choco-800">
                  ⚠️ {result.error}
                </div>
              ) : (
                <ScanResultsEnhanced 
                  results={transformToEnhancedResult(result)} 
                  onPreorderClick={openPreorder}
                  onCopyPrompt={copyToClipboard}
                />
              )}
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}