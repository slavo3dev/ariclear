/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
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

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recent' | 'low-score'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');

  // Auth check - redirect if not logged in
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }
  }, [authLoading, user, router]);

  // Initial load - fetch both scans and stats
  useEffect(() => {
    if (!user || authLoading) return;
    
    const loadData = async () => {
      await Promise.all([
        fetchScans(),
        fetchStats()
      ]);
    };
    
    loadData();
  }, [user, authLoading]);

  // Refetch scans when filter or sort changes
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
    
    console.log('🔍 Fetching scans with params:', params.toString());
    
    const res = await fetch(`/api/scans?${params.toString()}`);
    
    console.log('📡 Response status:', res.status);
    
    if (!res.ok) {
      throw new Error('Failed to fetch scans');
    }
    
    const data = await res.json();
    
    // Handle both possible response formats
    const scanData = data.scans || data || [];
    console.log('🎯 Final scan data:', scanData);
    
    setScans(Array.isArray(scanData) ? scanData : []);
  } catch (error) {
    console.error('❌ Error fetching scans:', error);
    toast.error('Failed to load scans');
    setScans([]);
  } finally {
    setLoading(false);
  }
};

  const fetchStats = async () => {
    try {
      console.log('📊 Fetching stats...');
      
      const res = await fetch('/api/scans/stats');
      
      if (res.ok) {
        const data = await res.json();
        console.log('📊 Stats received:', data.stats);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    }
  };

  const deleteScan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scan?')) return;
    
    try {
      const res = await fetch(`/api/scans/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete scan');
      }
      
      setScans(scans.filter(s => s.id !== id));
      toast.success('Scan deleted successfully');
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Error deleting scan:', error);
      toast.error('Failed to delete scan');
    }
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

  // Show loading only on initial load
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 bg-cream-50 flex items-center justify-center">
          <div className="text-center">
            <div className="relative h-16 w-16 mx-auto mb-4 overflow-hidden rounded-xl bg-choco-800 shadow-soft animate-pulse">
              <Image
                src="/branding/arilogo-optimized.png"
                alt="Loading"
                fill
                priority
                sizes="64px"
                className="object-contain p-2"
              />
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
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-choco-900">Scan History</h1>
            <p className="mt-2 text-sm text-choco-700">
              Track your website improvements over time
            </p>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="mb-8 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-choco-100 bg-white p-4 shadow-soft">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
                  Total Scans
                </p>
                <p className="mt-2 text-2xl font-semibold text-choco-900">
                  {stats.totalScans}
                </p>
              </div>

              <div className="rounded-2xl border border-choco-100 bg-white p-4 shadow-soft">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
                  Average Score
                </p>
                <p className="mt-2 text-2xl font-semibold text-choco-900">
                  {stats.averageScore}
                </p>
              </div>

              <div className="rounded-2xl border border-choco-100 bg-white p-4 shadow-soft">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
                  Domains Tracked
                </p>
                <p className="mt-2 text-2xl font-semibold text-choco-900">
                  {stats.uniqueDomains}
                </p>
              </div>

              <div className="rounded-2xl border border-choco-100 bg-white p-4 shadow-soft">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600">
                  Issues Found
                </p>
                <p className="mt-2 text-2xl font-semibold text-choco-900">
                  {stats.totalIssues}
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === 'all'
                    ? 'bg-choco-900 text-cream-50'
                    : 'bg-white text-choco-900 ring-1 ring-choco-200 hover:bg-cream-50'
                }`}
              >
                All Scans
              </button>
              <button
                onClick={() => setFilter('recent')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === 'recent'
                    ? 'bg-choco-900 text-cream-50'
                    : 'bg-white text-choco-900 ring-1 ring-choco-200 hover:bg-cream-50'
                }`}
              >
                Recent (7 days)
              </button>
              <button
                onClick={() => setFilter('low-score')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === 'low-score'
                    ? 'bg-choco-900 text-cream-50'
                    : 'bg-white text-choco-900 ring-1 ring-choco-200 hover:bg-cream-50'
                }`}
              >
                Needs Improvement (&lt;70)
              </button>
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

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="relative h-12 w-12 mx-auto mb-4 overflow-hidden rounded-xl bg-choco-800 shadow-soft animate-pulse">
                <Image
                  src="/branding/arilogo-optimized.png"
                  alt="Loading"
                  fill
                  sizes="48px"
                  className="object-contain p-2"
                />
              </div>
              <p className="text-sm text-choco-700">Loading scans...</p>
            </div>
          )}

          {/* Scans List */}
          {!loading && scans.length === 0 ? (
            <div className="rounded-2xl border border-choco-100 bg-white p-12 text-center shadow-soft">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-choco-900 mb-2">
                No scans found
              </h3>
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
          ) : !loading && scans.length > 0 ? (
            <div className="space-y-4">
              {scans.map((scan) => (
                <div
                  key={scan.id}
                  className="rounded-2xl border border-choco-100 bg-white p-6 shadow-soft transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Domain and URL */}
                      <div className="mb-3">
                        <h3 className="text-lg font-semibold text-choco-900">
                          {scan.domain}
                        </h3>Scans received:&nbsp;
                        <a
                          href={scan.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-choco-600 hover:text-choco-800 hover:underline"
                        >
                          {scan.url}
                        </a>
                      </div>

                      {/* Scores */}
                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 ${getScoreColor(scan.overall_score)}`}>
                          <span className="text-xs font-medium uppercase tracking-[0.12em]">
                            Overall
                          </span>
                          <span className="text-xl font-bold">
                            {scan.overall_score}
                          </span>
                          <span className="text-xs font-medium">
                            {getScoreGrade(scan.overall_score)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 rounded-full bg-cream-50 px-3 py-1.5 ring-1 ring-choco-100">
                          <span className="text-xs text-choco-600">Human:</span>
                          <span className="text-sm font-semibold text-choco-900">
                            {scan.human_score}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 rounded-full bg-cream-50 px-3 py-1.5 ring-1 ring-choco-100">
                          <span className="text-xs text-choco-600">AI:</span>
                          <span className="text-sm font-semibold text-choco-900">
                            {scan.ai_score}
                          </span>
                        </div>

                        {scan.issues && scan.issues.length > 0 && (
                          <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 ring-1 ring-red-200">
                            <span className="text-xs text-red-600">
                              {scan.issues.length} issues
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <p className="text-xs text-choco-500">
                        Scanned {new Date(scan.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/history/${scan.id}`}
                        className="inline-flex items-center justify-center rounded-full bg-choco-900 px-4 py-2 text-sm font-medium text-cream-50 transition hover:bg-choco-800 focus:outline-none focus:ring-2 focus:ring-choco-400"
                      >
                        View Details
                      </Link>
                      <button
                        onClick={() => deleteScan(scan.id)}
                        className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
