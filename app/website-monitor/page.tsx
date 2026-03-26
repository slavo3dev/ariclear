"use client";

import { useState, useCallback } from "react";
import { Navbar } from "@ariclear/components"; 


type SiteStatus = "UP" | "DOWN" | "NOT FOUND" | "SERVER ERROR" | "CHECKING" | "UNKNOWN";

interface SiteResult {
  url: string;
  statusCode: number | null;
  responseTime: number | null;
  status: SiteStatus;
  checkedAt: string;
}


function statusStyle(status: SiteStatus) {
  switch (status) {
    case "UP":
      return {
        badge: "bg-green-50 text-green-700 ring-1 ring-green-200",
        dot: "bg-green-500",
        row: "",
      };
    case "DOWN":
      return {
        badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
        dot: "bg-red-500",
        row: "bg-red-50/30",
      };
    case "NOT FOUND":
      return {
        badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        dot: "bg-amber-500",
        row: "bg-amber-50/30",
      };
    case "SERVER ERROR":
      return {
        badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
        dot: "bg-orange-500",
        row: "bg-orange-50/30",
      };
    case "CHECKING":
      return {
        badge: "bg-blue-50 text-blue-600 ring-1 ring-blue-200",
        dot: "bg-blue-400 animate-pulse",
        row: "",
      };
    default:
      return {
        badge: "bg-choco-50 text-choco-600 ring-1 ring-choco-200",
        dot: "bg-choco-400",
        row: "",
      };
  }
}

function classifyStatus(code: number): SiteStatus {
  if (code === 200) return "UP";
  if (code === 404) return "NOT FOUND";
  if (code >= 500) return "SERVER ERROR";
  return "UNKNOWN";
}

function formatUrl(raw: string): string {
  raw = raw.trim();
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    return "https://" + raw;
  }
  return raw;
}

function displayHostname(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function responseTimeColor(t: number) {
  if (t < 1) return "text-green-600";
  if (t < 3) return "text-amber-600";
  return "text-red-600";
}


function ResponseChart({ results }: { results: SiteResult[] }) {
  const valid = results.filter((r) => r.responseTime !== null);
  const max = Math.max(...valid.map((r) => r.responseTime!), 0.001);

  return (
    <div className="space-y-3">
      {results.map((r, i) => {
        const pct = r.responseTime !== null ? (r.responseTime / max) * 100 : 0;
        const isUp = r.status === "UP";
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-xs text-choco-600 font-mono">
              {displayHostname(r.url)}
            </span>
            <div className="flex-1 h-2 rounded-full bg-choco-100 overflow-hidden">
              {r.responseTime !== null && (
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: isUp
                      ? "linear-gradient(90deg, #16a34a, #4ade80)"
                      : "linear-gradient(90deg, #d97706, #fbbf24)",
                  }}
                />
              )}
            </div>
            <span className="w-14 text-right text-xs font-mono text-choco-700">
              {r.responseTime !== null ? `${r.responseTime}s` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({ results }: { results: SiteResult[] }) {
  const groups: Record<string, number> = {};
  results.forEach((r) => {
    groups[r.status] = (groups[r.status] || 0) + 1;
  });

  const palette: Record<string, string> = {
    UP: "#16a34a",
    DOWN: "#dc2626",
    "NOT FOUND": "#d97706",
    "SERVER ERROR": "#ea580c",
    UNKNOWN: "#78716c",
    CHECKING: "#3b82f6",
  };

  const total = results.length;
  let cumAngle = -90;

  const slices = Object.entries(groups).map(([key, count]) => {
    const angle = (count / total) * 360;
    const slice = { key, count, color: palette[key] ?? "#78716c", startAngle: cumAngle, endAngle: cumAngle + angle };
    cumAngle += angle;
    return slice;
  });

  function polarXY(deg: number, r: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: 50 + r * Math.cos(rad), y: 50 + r * Math.sin(rad) };
  }

  function arc(sa: number, ea: number, or_: number, ir: number) {
    if (ea - sa >= 360) ea = sa + 359.99;
    const s1 = polarXY(sa, or_), e1 = polarXY(ea, or_);
    const s2 = polarXY(ea, ir), e2 = polarXY(sa, ir);
    const lg = ea - sa > 180 ? 1 : 0;
    return `M ${s1.x} ${s1.y} A ${or_} ${or_} 0 ${lg} 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${ir} ${ir} 0 ${lg} 0 ${e2.x} ${e2.y} Z`;
  }

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={arc(s.startAngle, s.endAngle, 46, 28)} fill={s.color} />
        ))}
        <text x="50" y="46" textAnchor="middle" fill="#2b1510" fontSize="13" fontWeight="700">{total}</text>
        <text x="50" y="57" textAnchor="middle" fill="#964b2e" fontSize="6">checked</text>
      </svg>
      <div className="space-y-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-choco-700">{s.key}</span>
            <span className="ml-2 font-semibold text-choco-900">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WebsiteMonitorPage() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<SiteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const runChecks = useCallback(async () => {
    const rawUrls = input.split(",").map((s) => s.trim()).filter(Boolean);
    if (!rawUrls.length) return;

    const urls = rawUrls.map(formatUrl);
    const initial: SiteResult[] = urls.map((url) => ({
      url,
      statusCode: null,
      responseTime: null,
      status: "CHECKING",
      checkedAt: new Date().toISOString(),
    }));

    setResults(initial);
    setLoading(true);
    setDone(false);

    const updated = [...initial];
    await Promise.all(
      urls.map(async (url, i) => {
        try {
          const res = await fetch(`/api/check-site?url=${encodeURIComponent(url)}`);
          const data: { statusCode: number | null; responseTime: number | null } = await res.json();
          updated[i] = {
            url,
            statusCode: data.statusCode,
            responseTime: data.responseTime,
            status: data.statusCode ? classifyStatus(data.statusCode) : "DOWN",
            checkedAt: new Date().toISOString(),
          };
        } catch {
          updated[i] = { ...updated[i], status: "DOWN", checkedAt: new Date().toISOString() };
        }
        setResults([...updated]);
      })
    );

    setLoading(false);
    setDone(true);
  }, [input]);

  const exportCSV = () => {
    const header = "URL,Status Code,Response Time (s),Status,Checked At\n";
    const rows = results
      .map((r) => `${r.url},${r.statusCode ?? ""},${r.responseTime ?? ""},${r.status},${r.checkedAt}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ariclear-monitor-${Date.now()}.csv`;
    a.click();
  };

  const upCount = results.filter((r) => r.status === "UP").length;
  const downCount = results.filter(
    (r) => r.status !== "UP" && r.status !== "CHECKING"
  ).length;
  const validTimes = results.filter((r) => r.responseTime !== null);
  const avgTime =
    validTimes.length > 0
      ? validTimes.reduce((a, r) => a + r.responseTime!, 0) / validTimes.length
      : null;

  return (
    <div className="min-h-screen bg-cream-50 text-choco-900">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">

        {/* ── Page header ── */}
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-choco-100 px-3 py-1 text-xs font-medium text-choco-700 ring-1 ring-choco-200">
            <span className="h-1.5 w-1.5 rounded-full bg-choco-500" />
            New Feature
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-choco-900 sm:text-4xl">
            Website Monitor
          </h1>
          <p className="mt-2 text-base text-choco-600">
            Check if your websites are live, measure response times, and review HTTP status codes — instantly.
          </p>
        </div>

        {/* ── Input card ── */}
        <div className="rounded-2xl border border-choco-100 bg-white shadow-sm p-6 mb-8">
          <label className="mb-2 block text-sm font-medium text-choco-800">
            Enter websites to check
            <span className="ml-1 text-choco-400 font-normal">(comma-separated)</span>
          </label>
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && runChecks()}
              placeholder="google.com, github.com, yoursite.com"
              className="flex-1 rounded-xl border border-choco-200 bg-cream-50 px-4 py-2.5 text-sm text-choco-900 placeholder-choco-300 focus:outline-none focus:ring-2 focus:ring-choco-400 transition"
            />
            <button
              onClick={runChecks}
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-choco-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-choco-900 disabled:bg-choco-200 disabled:text-choco-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Checking…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Check
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-choco-400">
            No need to add https:// — we handle that automatically.
          </p>
        </div>

        {/* ── Summary stats ── */}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border border-choco-100 bg-white p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-600">{upCount}</div>
              <div className="text-xs text-choco-500 mt-0.5 uppercase tracking-wide">Online</div>
            </div>
            <div className="rounded-xl border border-choco-100 bg-white p-4 shadow-sm">
              <div className="text-2xl font-bold text-red-500">{downCount}</div>
              <div className="text-xs text-choco-500 mt-0.5 uppercase tracking-wide">Issues</div>
            </div>
            <div className="rounded-xl border border-choco-100 bg-white p-4 shadow-sm">
              <div className={`text-2xl font-bold ${avgTime !== null ? responseTimeColor(avgTime) : "text-choco-400"}`}>
                {avgTime !== null ? `${avgTime.toFixed(2)}s` : "—"}
              </div>
              <div className="text-xs text-choco-500 mt-0.5 uppercase tracking-wide">Avg Response</div>
            </div>
          </div>
        )}

        {/* ── Results table ── */}
        {results.length > 0 && (
          <div className="rounded-2xl border border-choco-100 bg-white shadow-sm overflow-hidden mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-choco-100">
              <h2 className="text-sm font-semibold text-choco-900 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${loading ? "bg-blue-400 animate-pulse" : "bg-green-500"}`} />
                {loading ? "Checking sites…" : `${results.length} site${results.length !== 1 ? "s" : ""} checked`}
              </h2>
              {done && (
                <button
                  onClick={exportCSV}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-choco-200 bg-cream-50 px-3 py-1.5 text-xs font-medium text-choco-700 transition hover:bg-choco-100"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>

            <div className="divide-y divide-choco-50">
              {results.map((r, i) => {
                const s = statusStyle(r.status);
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-4 px-6 py-4 transition ${s.row}`}
                  >
                    {/* Status dot */}
                    <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />

                    {/* URL */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-choco-900 truncate">
                        {displayHostname(r.url)}
                      </p>
                      <p className="text-xs text-choco-400 truncate">{r.url}</p>
                    </div>

                    {/* Status badge */}
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.badge}`}>
                      {r.status === "CHECKING" ? (
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Checking
                        </span>
                      ) : r.status}
                    </span>

                    {/* HTTP code */}
                    <span className="w-12 shrink-0 text-center font-mono text-xs text-choco-500">
                      {r.statusCode ?? "—"}
                    </span>

                    {/* Response time */}
                    <span className={`w-14 shrink-0 text-right font-mono text-xs font-medium ${r.responseTime !== null ? responseTimeColor(r.responseTime) : "text-choco-300"}`}>
                      {r.responseTime !== null ? `${r.responseTime}s` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Charts ── */}
        {done && results.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Response time chart */}
            <div className="rounded-2xl border border-choco-100 bg-white shadow-sm p-6">
              <h3 className="mb-5 text-sm font-semibold text-choco-800 flex items-center gap-2">
                <svg className="h-4 w-4 text-choco-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                Response Times
              </h3>
              <ResponseChart results={results} />
            </div>

            {/* Status donut */}
            <div className="rounded-2xl border border-choco-100 bg-white shadow-sm p-6">
              <h3 className="mb-5 text-sm font-semibold text-choco-800 flex items-center gap-2">
                <svg className="h-4 w-4 text-choco-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6zM13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                </svg>
                Status Overview
              </h3>
              <DonutChart results={results} />
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-choco-200 bg-white/50 py-20 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-choco-100">
              <svg className="h-6 w-6 text-choco-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253" />
              </svg>
            </div>
            <p className="text-sm font-medium text-choco-700">No sites checked yet</p>
            <p className="mt-1 text-xs text-choco-400">
              Enter some URLs above and hit <span className="font-medium text-choco-600">Run Check</span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
