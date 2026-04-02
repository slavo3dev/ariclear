"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Navbar,
  SiteFooter,
  Button,
  usePreorder,
  useAuth,
  AuthModal,
  ScanResultsEnhanced
} from "@ariclear/components";

type ErrorCode = "SCAN_LIMIT_REACHED" | "TRIAL_EXPIRED" | "RATE_LIMIT" | "FETCH_ERROR" | "AI_ERROR";

type LimitStatus = {
  tier: string;
  limit: number;
  current: number;
  limitReached: boolean;
  trialExpired: boolean;
};

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
  errorCode?: ErrorCode;
  requiresUpgrade?: boolean;
  limit?: number;
  current?: number;
  tier?: string;
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

          <p className="mt-3 text-sm font-medium text-cream-50">{current.status}</p>

          {url && (
            <p className="mt-1 max-w-full truncate text-[11px] text-choco-300">{url}</p>
          )}

          <div className="mt-4 w-full">
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={[
                    "h-2 flex-1 rounded-full transition-all",
                    i < step ? "bg-choco-400" : i === step ? "bg-choco-700" : "bg-choco-800",
                  ].join(" ")}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-choco-400">
              <span>{current.label}</span>
              <span>{step + 1}/{steps.length}</span>
            </div>
          </div>

          <div className="mt-5 w-full rounded-2xl bg-choco-800/60 p-4 ring-1 ring-choco-700">
            <p className="text-[12px] leading-relaxed text-cream-100">
              &quot;{current.quote.text}&quot;
            </p>
            <p className="mt-2 text-[11px] text-choco-300">— {current.quote.by}</p>
          </div>

          <p className="mt-3 text-[11px] text-choco-300">
            Calm analysis. No rushing. Clarity takes discipline.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Limit banner — shown BEFORE analyzing
// ─────────────────────────────────────────────

function ScanLimitBanner({
  limitStatus,
  onUpgrade,
}: {
  limitStatus: LimitStatus;
  onUpgrade: () => void;
}) {
  const { tier, limit, trialExpired } = limitStatus;

  const title = trialExpired ? "Your trial has expired" : "Website limit reached";

  const body = trialExpired
    ? "Your 60-day trial has ended. Upgrade to Pro to continue scanning and tracking your websites."
    : tier === "free"
    ? `You've used your ${limit} free website slot${limit !== 1 ? "s" : ""}. Request a 60-day trial or upgrade to Pro to scan more sites.`
    : `You've reached your plan limit of ${limit} website${limit !== 1 ? "s" : ""}. Contact us to expand your plan.`;

  const upgradeLabel = tier === "free" ? "Upgrade to Pro" : "Upgrade plan";

  const mailSubject = trialExpired
    ? "Renew my trial / upgrade"
    : "More website scans — upgrade request";

  const mailBody = `Hi, I've reached my scan limit (tier: ${tier}, limit: ${limit}). I'd like to upgrade or get more scans.`;

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-xl">🚫</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-choco-900">{title}</p>
          <p className="mt-1 text-sm text-choco-700">{body}</p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={onUpgrade} className="w-full sm:w-auto">
              {upgradeLabel}
            </Button>
            <a
              href={`mailto:hello@ariclear.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`}
              className="inline-flex w-full items-center justify-center rounded-full border border-choco-300 bg-white px-4 py-2 text-sm font-medium text-choco-800 transition-colors hover:bg-choco-50 sm:w-auto"
            >
              Contact us
            </a>
          </div>

          {tier === "free" && !trialExpired && (
            <p className="mt-3 text-[11px] text-choco-500">
              Free plan includes 1 website. Pro plan unlocks unlimited websites and full scan history.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Post-analyze error banners
// ─────────────────────────────────────────────

function RateLimitBanner() {
  return (
    <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-xl">⏳</span>
        <div>
          <p className="text-sm font-semibold text-choco-900">Too many requests</p>
          <p className="mt-1 text-sm text-choco-700">
            You&apos;re scanning too fast. Please wait 60 seconds and try again.
          </p>
        </div>
      </div>
    </div>
  );
}

function GenericErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-choco-200 bg-white p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-xl">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-choco-900">Something went wrong</p>
          <p className="mt-1 text-sm text-choco-700">{message}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function ScanPage() {
  const router = useRouter();
  const { open: openPreorder } = usePreorder();
  const { user, loading: authLoading } = useAuth();

  const [authOpen, setAuthOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  // Limit state — fetched once on mount, refreshed after each scan saves a new domain
  const [limitStatus, setLimitStatus] = useState<LimitStatus | null>(null);
  const [limitLoading, setLimitLoading] = useState(false);

  const cleanedUrl = useMemo(() => targetUrl.trim(), [targetUrl]);
  const isAtLimit = limitStatus?.limitReached ?? false;

  const canAnalyze = useMemo(
    () => !!cleanedUrl && isValidHttpUrl(cleanedUrl) && !loading && !isAtLimit,
    [cleanedUrl, loading, isAtLimit],
  );

  const fetchLimitStatus = async () => {
    setLimitLoading(true);
    try {
      const res = await fetch("/api/scans/limit");
      if (res.ok) {
        const data = await res.json();
        setLimitStatus(data as LimitStatus);
      }
    } catch {
      // Non-critical — silently ignore
    } finally {
      setLimitLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAuthOpen(true);
      return;
    }
    fetchLimitStatus();
   
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

      if (!res.ok) {
        if (res.status === 429) {
          setResult({ error: json?.error || "Rate limit reached.", errorCode: "RATE_LIMIT" });
          return;
        }

        if (res.status === 403 && json?.requiresUpgrade) {
          // Defensive: shouldn't happen since we check upfront, but update limit state
          setLimitStatus({
            tier: json.tier ?? "free",
            limit: json.limit ?? 1,
            current: json.current ?? 0,
            limitReached: true,
            trialExpired: json.errorCode === "TRIAL_EXPIRED",
          });
          return;
        }

        setResult({ error: json?.error || "Analysis failed." });
        toast.error(json?.error || "Analysis failed.");
        return;
      }

      setResult(json);

      // Save to DB and refresh limit (a new domain may have been added)
      try {
        const saveRes = await fetch("/api/scans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analyzeResult: json, url: cleanedUrl }),
        });

        if (saveRes.ok) {
          toast.success("Scan saved to history!");
          await fetchLimitStatus();
        } else if (saveRes.status === 403) {
          const saveError = (await saveRes.json()) as AnalyzeResponse;
          if (saveError.requiresUpgrade) {
            setLimitStatus({
              tier: saveError.tier ?? "free",
              limit: saveError.limit ?? 1,
              current: saveError.current ?? 0,
              limitReached: true,
              trialExpired: saveError.errorCode === "TRIAL_EXPIRED",
            });
          }
        }
      } catch (saveError) {
        console.error("Error saving scan:", saveError);
      }
    } catch {
      setResult({ error: "Network error. Please try again." });
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformToEnhancedResult = (apiResult: AnalyzeResponse): any => {
    const humanScore = apiResult.human?.clarityScore ?? 0;
    const aiScore = apiResult.ai?.aiSeoScore ?? 0;
    const combinedScore = Math.round((humanScore + aiScore) / 2);

    const categorizeIssue = (issueText: string): "security" | "privacy" | "performance" | "accessibility" => {
      const text = issueText.toLowerCase();
      if (text.includes("speed") || text.includes("load") || text.includes("performance") ||
          text.includes("slow") || text.includes("fast") || text.includes("image") ||
          text.includes("optimize") || text.includes("cache") || text.includes("seo") ||
          text.includes("keyword")) return "performance";
      if (text.includes("privacy") || text.includes("gdpr") || text.includes("cookie") ||
          text.includes("tracking") || text.includes("data") || text.includes("consent") ||
          text.includes("analytics")) return "privacy";
      if (text.includes("security") || text.includes("ssl") || text.includes("https") ||
          text.includes("encrypt") || text.includes("password") || text.includes("auth")) return "security";
      return "accessibility";
    };

    const issues = (apiResult.human?.topIssues ?? []).map((issue, idx) => ({
      id: `issue-${idx}`,
      category: categorizeIssue(issue.issue + " " + issue.whyItHurts),
      severity: (["critical", "high", "medium", "low"] as const)[Math.min(idx, 3)],
      title: issue.issue,
      description: issue.whyItHurts,
      impact: issue.fix,
      fixed: false,
    }));

    const suggestions = (apiResult.plan?.nextSteps ?? []).map((step, idx) => ({
      id: `suggestion-${idx}`,
      title: step.title,
      description: step.details,
      priority: step.impact,
      estimatedTime: step.effort === "low" ? "1-2 hours" : step.effort === "medium" ? "2-4 hours" : "4-8 hours",
      resources: [],
    }));

    if (apiResult.ai?.structuredDataSuggestions) {
      apiResult.ai.structuredDataSuggestions.forEach((suggestion, idx) => {
        suggestions.push({
          id: `ai-suggestion-${idx}`,
          title: suggestion.length > 50 ? suggestion.substring(0, 50) + "..." : suggestion,
          description: suggestion,
          priority: "medium" as const,
          estimatedTime: "2-3 hours",
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

  const renderPostAnalyzeError = (r: AnalyzeResponse) => {
    if (r.errorCode === "RATE_LIMIT") return <RateLimitBanner />;
    return <GenericErrorBanner message={r.error ?? "Something went wrong. Please try again."} />;
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
                disabled={loading || isAtLimit}
                className="w-full rounded-full border border-choco-200 bg-cream-50 px-4 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-1 focus:ring-choco-500 disabled:opacity-60"
                onKeyDown={(e) => { if (e.key === "Enter") onAnalyze(); }}
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

            {/* Limit reached — shown immediately, no analyzing required */}
            {!limitLoading && isAtLimit && limitStatus ? (
              <ScanLimitBanner limitStatus={limitStatus} onUpgrade={openPreorder} />
            ) : (
              <>
                {!cleanedUrl ? (
                  <p className="mt-2 text-[11px] text-choco-500">
                    Tip: use your homepage URL (not a login page).
                  </p>
                ) : !isValidHttpUrl(cleanedUrl) ? (
                  <p className="mt-2 text-[11px] text-red-700">
                    Please enter a valid URL starting with http:// or https://
                  </p>
                ) : (
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] text-choco-500">
                      Demo mode: public pages only. Login walls may not work.
                    </p>
                    <p className="text-[11px] text-yellow-700 flex items-start gap-1">
                      <span>⚠️</span>
                      <span>
                        Some websites block automated scanning (banks, e-commerce, sites behind Cloudflare).
                        Try scanning your own website or smaller business sites.
                      </span>
                    </p>
                  </div>
                )}

                {/* Usage counter — subtle, only when not at limit */}
                {!limitLoading && limitStatus && (
                  <p className="mt-3 text-[11px] text-choco-400">
                    {limitStatus.current} / {limitStatus.limit} website{limitStatus.limit !== 1 ? "s" : ""} used
                    {limitStatus.tier !== "free" ? ` · ${limitStatus.tier} plan` : ""}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Post-analyze results (only shown when not at limit) */}
          {result && !isAtLimit && (
            result.error
              ? renderPostAnalyzeError(result)
              : (
                <ScanResultsEnhanced
                  results={transformToEnhancedResult(result)}
                  onPreorderClick={openPreorder}
                  onCopyPrompt={copyToClipboard}
                />
              )
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}