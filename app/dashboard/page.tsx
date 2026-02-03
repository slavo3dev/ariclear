"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@ariclear/components";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SubscriptionInfo = {
  tier: string;
  websites_limit: number;
  websites_used: number;
  websites_remaining: number;
  trial_expires_at: string | null;
  is_trial_expired: boolean;
  can_scan: boolean;
};

type ScanHistoryItem = {
  id: string;
  url: string;
  created_at: string;
  status: string;
  issues_found?: number;
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [recentScans, setRecentScans] = useState<ScanHistoryItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        setLoadingData(true);

        // Fetch subscription info
        const subRes = await fetch("/api/subscription");
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData);
        }

        // Fetch recent scans (you'll need to implement this endpoint)
        const scansRes = await fetch("/api/scans?limit=5");
        if (scansRes.ok) {
          const scansData = await scansRes.json();
          setRecentScans(scansData.scans || []);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const getTierBadgeColor = (tier?: string) => {
    if (!tier) return "bg-gray-100 text-gray-700 ring-gray-300";

    switch (tier.toLowerCase()) {
      case "free":
        return "bg-gray-100 text-gray-700 ring-gray-300";
      case "trial":
        return "bg-blue-100 text-blue-700 ring-blue-300";
      case "starter":
        return "bg-green-100 text-green-700 ring-green-300";
      case "pro":
        return "bg-purple-100 text-purple-700 ring-purple-300";
      case "business":
        return "bg-orange-100 text-orange-700 ring-orange-300";
      case "agency":
        return "bg-red-100 text-red-700 ring-red-300";
      default:
        return "bg-gray-100 text-gray-700 ring-gray-300";
    }
  };

  const getTierLabel = (tier?: string) => {
    if (!tier) return "Free";
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getUsagePercentage = () => {
    if (!subscription) return 0;
    return (subscription.websites_used / subscription.websites_limit) * 100;
  };

  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-orange-500";
    return "bg-green-500";
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-choco-600">Loading dashboard...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-choco-900">Dashboard</h1>
          <p className="mt-2 text-choco-600">
            Welcome back, {user.email?.split("@")[0]}!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Subscription Card */}
          <div className="bg-white rounded-2xl shadow-soft p-6 border border-choco-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-choco-600">
                Subscription Plan
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ring-1 ${getTierBadgeColor(
                  subscription?.tier
                )}`}
              >
                {getTierLabel(subscription?.tier)}
              </span>
            </div>
            {subscription?.trial_expires_at && !subscription.is_trial_expired && (
              <p className="text-xs text-choco-500 mt-2">
                Trial expires: {formatDate(subscription.trial_expires_at)}
              </p>
            )}
            {subscription?.is_trial_expired && (
              <p className="text-xs text-red-600 mt-2 font-medium">
                Trial expired
              </p>
            )}
          </div>

          {/* Websites Usage Card */}
          <div className="bg-white rounded-2xl shadow-soft p-6 border border-choco-100">
            <h3 className="text-sm font-medium text-choco-600 mb-4">
              Website Usage
            </h3>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-choco-900">
                  {subscription?.websites_used || 0}
                </span>
                <span className="text-sm text-choco-500">
                  of {subscription?.websites_limit || 0}
                </span>
              </div>
              <div className="w-full bg-choco-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getUsageColor()}`}
                  style={{ width: `${getUsagePercentage()}%` }}
                />
              </div>
              <p className="text-xs text-choco-500">
                {subscription?.websites_remaining || 0} websites remaining
              </p>
            </div>
          </div>

          {/* Scan Status Card */}
          <div className="bg-white rounded-2xl shadow-soft p-6 border border-choco-100">
            <h3 className="text-sm font-medium text-choco-600 mb-4">
              Scan Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    subscription?.can_scan ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm text-choco-700">
                  {subscription?.can_scan
                    ? "Ready to scan"
                    : "Scan limit reached"}
                </span>
              </div>
              {subscription?.can_scan && (
                <Link
                  href="/scan"
                  className="inline-flex items-center justify-center w-full rounded-xl bg-choco-800 px-4 py-2 text-sm font-medium text-white hover:bg-choco-900 transition"
                >
                  Start New Scan
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Recent Scans */}
        <div className="bg-white rounded-2xl shadow-soft border border-choco-100">
          <div className="px-6 py-4 border-b border-choco-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-choco-900">
                Recent Scans
              </h2>
              <Link
                href="/history"
                className="text-sm text-choco-600 hover:text-choco-900 transition"
              >
                View all →
              </Link>
            </div>
          </div>

          <div className="divide-y divide-choco-100">
            {recentScans.length > 0 ? (
              recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="px-6 py-4 hover:bg-cream-50/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-choco-900 truncate">
                        {scan.url}
                      </p>
                      <p className="text-xs text-choco-500 mt-1">
                        {formatDate(scan.created_at)}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      {scan.issues_found !== undefined && (
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            scan.issues_found > 0
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {scan.issues_found} issues
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          scan.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : scan.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {scan.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-choco-500">No scans yet</p>
                <Link
                  href="/scan"
                  className="inline-block mt-4 text-sm text-choco-700 hover:text-choco-900 font-medium transition"
                >
                  Start your first scan →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/scan"
            className="bg-white rounded-xl shadow-soft p-6 border border-choco-100 hover:shadow-md transition group"
          >
            <div className="text-2xl mb-2">🔍</div>
            <h3 className="font-semibold text-choco-900 group-hover:text-choco-700 transition">
              New Scan
            </h3>
            <p className="text-sm text-choco-600 mt-1">
              Scan a website for accessibility issues
            </p>
          </Link>

          <Link
            href="/history"
            className="bg-white rounded-xl shadow-soft p-6 border border-choco-100 hover:shadow-md transition group"
          >
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-choco-900 group-hover:text-choco-700 transition">
              View History
            </h3>
            <p className="text-sm text-choco-600 mt-1">
              Review all your past scans
            </p>
          </Link>

          <button
            type="button"
            className="bg-white rounded-xl shadow-soft p-6 border border-choco-100 hover:shadow-md transition group text-left"
            onClick={() => {
              // You can add settings/profile functionality here
              console.log("Settings clicked");
            }}
          >
            <div className="text-2xl mb-2">⚙️</div>
            <h3 className="font-semibold text-choco-900 group-hover:text-choco-700 transition">
              Settings
            </h3>
            <p className="text-sm text-choco-600 mt-1">
              Manage your account preferences
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}