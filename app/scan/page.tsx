// src/app/scan/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar, SiteFooter, Button } from "@ariclear/components";
import { usePreorder, useAuth, AuthModal } from "@ariclear/components";

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

function isValidHttpUrl(input: string) {
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
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

  // Gate access to authenticated users only
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setAuthOpen(true);
    }
  }, [authLoading, user]);

  const closeAuth = () => {
    setAuthOpen(false);
    // If they close auth without logging in, take them home
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
        setResult({ error: json?.error || "Analysis failed" });
      } else {
        setResult(json);
      }
    } catch {
      setResult({ error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Auth gate modal */}
      <AuthModal open={authOpen} onClose={closeAuth} initialMode="login" />

      <main className="flex-1 bg-cream-50">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold text-choco-900">AriClear Demo</h1>
          <p className="mt-2 text-sm text-choco-700">
            Paste a homepage URL. AriClear checks whether a first-time visitor
            understands what the site does in ~10 seconds, and whether an AI model
            can correctly read and classify it for AI search (AI-SEO).
          </p>

          {/* Optional: show a gentle message while auth loads */}
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
              <p className="mt-2 text-[11px] text-choco-500">
                Tip: use your homepage URL (not a login page).
              </p>
            ) : !isValidHttpUrl(cleanedUrl) ? (
              <p className="mt-2 text-[11px] text-red-700">
                Please enter a valid URL starting with http:// or https://
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-choco-500">
                Demo mode: we analyze public pages only. Private pages/login
                walls may not work.
              </p>
            )}
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
                        AI comprehension
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-choco-900">
                        {result.ai?.aiSeoScore ?? "--"} / 100
                      </p>
                      <p className="mt-2 text-sm text-choco-700">
                        {result.ai?.aiSummary ?? ""}
                      </p>

                      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-choco-600">
                        Missing / unclear keywords
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(result.ai?.missingKeywords ?? []).map((k) => (
                          <span
                            key={k}
                            className="rounded-full bg-cream-50 px-3 py-1 text-[11px] text-choco-700 ring-1 ring-choco-100"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
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

                    <button
                      type="button"
                      onClick={openPreorder}
                      className="mt-3 inline-flex items-center rounded-full bg-choco-900 px-4 py-2 text-[11px] font-medium text-cream-50 transition hover:bg-choco-800 focus:outline-none focus:ring-2 focus:ring-choco-400"
                    >
                      {result.copy?.suggestedCTA ?? "Get early access"}
                    </button>

                    <p className="mt-2 text-[11px] text-choco-500">
                      Want a full report + recommendations? Join early access.
                    </p>
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
