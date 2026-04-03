/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  Navbar,
  SiteFooter,
  useAuth
} from "@ariclear/components";

type Scan = {
  id: string;
  domain: string;
  url: string;
  overall_score: number;
  human_score: number;
  ai_score: number;
  created_at: string;
  updated_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  issues: any[];
};

type Stats = {
  totalScans: number;
  averageScore: number;
  uniqueDomains: number;
  totalIssues: number;
  recentScans: number;
  scoreDistribution: {
    excellent: number;
    good: number;
    needsImprovement: number;
  };
};

type LimitStatus = {
  tier: string;
  limit: number;
  current: number;
  limitReached: boolean;
  trialExpired: boolean;
};

function groupByDomain(scans: Scan[]): Record<string, Scan[]> {
  return scans.reduce<Record<string, Scan[]>>((acc, scan) => {
    if (!acc[scan.domain]) acc[scan.domain] = [];
    acc[scan.domain].push(scan);
    return acc;
  }, {});
}

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [scans, setScans] = useState<Scan[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [limitStatus, setLimitStatus] = useState<LimitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recent' | 'low-score'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/'); return; }
  }, [authLoading, user, router]);

  // Initial load
  useEffect(() => {
    if (!user || authLoading) return;
    Promise.all([fetchScans(), fetchStats(), fetchLimitStatus()]);
  }, [user, authLoading]);

  // Re-fetch scans on filter/sort change
  useEffect(() => {
    if (!user || authLoading) return;
    fetchScans();
  }, [filter, sortBy]);

  const fetchScans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('filter', filter);
      params.set('sortBy', sortBy);
      const res = await fetch(`/api/scans?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch scans');
      const data = await res.json();
      const scanData = data.scans || data || [];
      setScans(Array.isArray(scanData) ? scanData : []);
    } catch {
      toast.error('Failed to load scans');
      setScans([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/scans/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch { /* non-critical */ }
  };

  const fetchLimitStatus = async () => {
    try {
      const res = await fetch('/api/scans/limit');
      if (res.ok) {
        const data = await res.json();
        setLimitStatus(data as LimitStatus);
      }
    } catch { /* non-critical */ }
  };

  // Delete a single scan — frees slot if it was the last one for that domain
  const deleteScan = useCallback(async (id: string, domain: string) => {
    if (!confirm('Delete this scan? If this is the last scan for this site, the website slot will be freed.')) return;

    setDeletingIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/scans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      const result = await res.json();
      setScans(prev => prev.filter(s => s.id !== id));

      if (result.websiteSlotFreed) {
        toast.success(`Scan deleted — website slot for ${domain} has been freed`);
        await fetchLimitStatus();
      } else {
        toast.success('Scan deleted');
      }

      fetchStats();
    } catch {
      toast.error('Failed to delete scan');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  // Remove ALL scans for a domain — always frees the slot
  const removeSite = useCallback(async (domain: string) => {
    const domainScans = scans.filter(s => s.domain === domain);
    if (!confirm(
      `Remove "${domain}" and delete all ${domainScans.length} scan${domainScans.length !== 1 ? 's' : ''}?\n\nThis will free up a website slot so you can add a new site.`
    )) return;

    const ids = domainScans.map(s => s.id);
    setDeletingIds(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; });

    try {
      // Delete each scan — the last one will free the slot server-side
      for (const id of ids) {
        await fetch(`/api/scans/${id}`, { method: 'DELETE' });
      }
      setScans(prev => prev.filter(s => s.domain !== domain));
      toast.success(`"${domain}" removed — website slot freed`);
      await Promise.all([fetchStats(), fetchLimitStatus()]);
    } catch {
      toast.error('Failed to remove site');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    }
  }, [scans]);

  const toggleDomain = (domain: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      next.has(domain) ? next.delete(domain) : next.add(domain);
      return next;
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-700 bg-green-50 ring-green-200';
    if (score >= 60) return 'text-yellow-700 bg-yellow-50 ring-yellow-200';
    return 'text-red-700 bg-red-50 ring-red-200';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const grouped = groupByDomain(scans);
  const domains = Object.keys(grouped);

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 bg-cream-50 flex items-center justify-center">
          <div className="text-center">
            <div className="relative h-16 w-16 mx-auto mb-4 overflow-hidden rounded-xl bg-choco-800 shadow-soft animate-pulse">
              <Image src="/branding/arilogo-optimized.png" alt="Loading" fill priority sizes="64px" className="object-contain p-2" />
            </div>
            <p className="text-sm text-choco-700">Loading...</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-cream-50">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-choco-900">Scan History</h1>
              <p className="mt-2 text-sm text-choco-700">
                Track your website improvements over time
              </p>
            </div>
            <Link
              href="/scan"
              className="shrink-0 inline-flex items-center rounded-full bg-choco-900 px-4 py-2 text-sm font-medium text-cream-50 transition hover:bg-choco-800 focus:outline-none focus:ring-2 focus:ring-choco-400"
            >
              + New Scan
            </Link>
          </div>

          {/* Website slot usage */}
          {limitStatus && (
            <div className={`mb-6 rounded-2xl border p-4 shadow-soft ${
              limitStatus.limitReached
                ? 'border-amber-200 bg-amber-50'
                : 'border-choco-100 bg-white'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-choco-900">Website slots</p>
                <span className={`text-sm font-semibold ${limitStatus.limitReached ? 'text-amber-700' : 'text-choco-900'}`}>
                  {limitStatus.current} / {limitStatus.limit} used
                </span>
              </div>
              <div className="w-full bg-choco-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    limitStatus.limitReached ? 'bg-amber-500' :
                    limitStatus.current / limitStatus.limit >= 0.7 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((limitStatus.current / limitStatus.limit) * 100, 100)}%` }}
                />
              </div>
              {limitStatus.limitReached ? (
                <p className="mt-2 text-xs text-amber-700">
                  Slot limit reached. Use <strong>Remove site</strong> below to free a slot for a new website.
                </p>
              ) : (
                <p className="mt-2 text-xs text-choco-500">
                  {limitStatus.limit - limitStatus.current} slot{limitStatus.limit - limitStatus.current !== 1 ? 's' : ''} available.
                  Remove a site below to free up more.
                </p>
              )}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="mb-8 grid gap-4 grid-cols-2 md:grid-cols-4">
              {[
                { label: 'Total Scans', value: stats.totalScans },
                { label: 'Average Score', value: stats.averageScore },
                { label: 'Domains Tracked', value: stats.uniqueDomains },
                { label: 'Issues Found', value: stats.totalIssues },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-choco-100 bg-white p-4 shadow-soft">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-choco-900">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'all', label: 'All Scans' },
                { value: 'recent', label: 'Recent (7 days)' },
                { value: 'low-score', label: 'Needs Improvement (<70)' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === value
                      ? 'bg-choco-900 text-cream-50'
                      : 'bg-white text-choco-900 ring-1 ring-choco-200 hover:bg-cream-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-choco-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'score')}
                className="rounded-full border border-choco-200 bg-white px-3 py-1.5 text-sm text-choco-900 focus:border-choco-500 focus:outline-none focus:ring-1 focus:ring-choco-500"
              >
                <option value="date">Date</option>
                <option value="score">Score</option>
              </select>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div className="relative h-12 w-12 mx-auto mb-4 overflow-hidden rounded-xl bg-choco-800 shadow-soft animate-pulse">
                <Image src="/branding/arilogo-optimized.png" alt="Loading" fill sizes="48px" className="object-contain p-2" />
              </div>
              <p className="text-sm text-choco-700">Loading scans...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && scans.length === 0 && (
            <div className="rounded-2xl border border-choco-100 bg-white p-12 text-center shadow-soft">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-choco-900 mb-2">No scans found</h3>
              <p className="text-sm text-choco-600 mb-6">
                {filter !== 'all'
                  ? 'Try adjusting your filters or scan a new website'
                  : 'Start by scanning your first website'}
              </p>
              <Link
                href="/scan"
                className="inline-flex items-center rounded-full bg-choco-900 px-6 py-3 text-sm font-medium text-cream-50 transition hover:bg-choco-800 focus:outline-none focus:ring-2 focus:ring-choco-400"
              >
                Scan a Website
              </Link>
            </div>
          )}

          {/* Grouped domain cards */}
          {!loading && domains.length > 0 && (
            <div className="space-y-4">
              {domains.map((domain) => {
                const domainScans = grouped[domain];
                const latestScan = domainScans[0];
                const isExpanded = expandedDomains.has(domain);
                const isDeletingAny = domainScans.some(s => deletingIds.has(s.id));
                const hasMultiple = domainScans.length > 1;

                return (
                  <div
                    key={domain}
                    className="rounded-2xl border border-choco-100 bg-white shadow-soft overflow-hidden"
                  >
                    {/* Domain header */}
                    <div className="flex items-center gap-4 p-5">
                      {/* Favicon */}
                      <div className="shrink-0 h-9 w-9 rounded-xl bg-choco-50 border border-choco-100 flex items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://www.google.com/s2/favicons?sz=32&domain=${domain}`}
                          alt=""
                          width={20}
                          height={20}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-choco-900">{domain}</h3>
                          <span className="text-[11px] text-choco-400 bg-choco-50 rounded-full px-2 py-0.5">
                            {domainScans.length} scan{domainScans.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {/* Latest score + bar */}
                        <div className="mt-2 flex items-center gap-3">
                          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 text-xs font-semibold ${getScoreColor(latestScan.overall_score)}`}>
                            {latestScan.overall_score}
                            <span className="opacity-70">{getScoreGrade(latestScan.overall_score)}</span>
                          </div>
                          <div className="flex-1 max-w-[140px] bg-choco-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${getScoreBarColor(latestScan.overall_score)}`}
                              style={{ width: `${latestScan.overall_score}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-choco-400">
                            {new Date(latestScan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex flex-wrap items-center gap-2">
                        {/* Remove site — frees the slot */}
                        <button
                          onClick={() => removeSite(domain)}
                          disabled={isDeletingAny}
                          title="Remove this site and free its website slot"
                          className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-40"
                        >
                          🗑 Remove site
                        </button>

                        {/* Expand/collapse if multiple scans */}
                        {hasMultiple && (
                          <button
                            onClick={() => toggleDomain(domain)}
                            className="inline-flex items-center gap-1 rounded-full border border-choco-200 bg-white px-3 py-1.5 text-xs font-medium text-choco-700 transition hover:bg-cream-50"
                          >
                            {isExpanded ? '▲ Hide scans' : `▼ ${domainScans.length} scans`}
                          </button>
                        )}

                        <Link
                          href={`/history/${latestScan.id}`}
                          className="inline-flex items-center justify-center rounded-full bg-choco-900 px-4 py-1.5 text-xs font-medium text-cream-50 transition hover:bg-choco-800"
                        >
                          View latest
                        </Link>
                      </div>
                    </div>

                    {/* Individual scans list — shown when expanded, or always if only 1 */}
                    {(isExpanded || !hasMultiple) && (
                      <div className="border-t border-choco-100 divide-y divide-choco-50">
                        {domainScans.map((scan) => (
                          <div
                            key={scan.id}
                            className={`flex items-center gap-4 px-5 py-3 text-sm transition ${
                              deletingIds.has(scan.id) ? 'opacity-40 pointer-events-none' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${getScoreColor(scan.overall_score)}`}>
                                {scan.overall_score}
                              </span>
                              <span className="text-xs text-choco-500">
                                H: {scan.human_score} · AI: {scan.ai_score}
                              </span>
                              {scan.issues?.length > 0 && (
                                <span className="text-xs text-red-600 bg-red-50 rounded-full px-2 py-0.5 ring-1 ring-red-200">
                                  {scan.issues.length} issue{scan.issues.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              <span className="text-xs text-choco-400">
                                {new Date(scan.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'short', day: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>

                            <div className="shrink-0 flex items-center gap-3">
                              <Link
                                href={`/history/${scan.id}`}
                                className="text-xs text-choco-600 hover:text-choco-900 hover:underline transition"
                              >
                                Details
                              </Link>
                              <button
                                onClick={() => deleteScan(scan.id, scan.domain)}
                                disabled={deletingIds.has(scan.id)}
                                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition"
                              >
                                {deletingIds.has(scan.id) ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}