"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@ariclear/components";
import { usePreorder, useAuth, AuthModal } from "@ariclear/components";
import { useRouter } from "next/navigation";

type SubscriptionInfo = {
  tier: string;
  websites_limit: number;
  websites_used: number;
  websites_remaining: number;
  trial_expires_at: string | null;
  is_trial_expired: boolean;
  can_scan: boolean;
};

export function Navbar() {
  const { open: openPreorderModal } = usePreorder();
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") setMobileOpen(false);
  };
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, []);

// Fetch subscription when user logs in
useEffect(() => {
  if (!user) return;

  const controller = new AbortController();
  let alive = true;

  (async () => {
    try {
      const res = await fetch("/api/subscription", { signal: controller.signal });
      if (!res.ok) return;

      const data = await res.json();

      if (!alive) return;

      // defer state update so it’s not synchronous inside effect lifecycle
      queueMicrotask(() => {
        if (alive) setSubscription(data);
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      console.error("Error fetching subscription:", error);
    }
  })();

  return () => {
    alive = false;
    controller.abort();
  };
}, [user]);




  const closeMobile = () => setMobileOpen(false);

  const handleTryDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    closeMobile();

    if (loading) return;

    if (!user) {
      setAuthOpen(true);
      return;
    }

    router.push("/scan");
  };

  const handleLogin = () => {
    closeMobile();
    setAuthOpen(true);
  };

  const handleLogout = async () => {
    closeMobile();
    await signOut();
    router.push("/");
  };

  const handleEarlyAccess = () => {
    closeMobile();
    openPreorderModal();
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'bg-gray-100 text-gray-700 ring-gray-300';
      case 'trial':
        return 'bg-blue-100 text-blue-700 ring-blue-300';
      case 'starter':
        return 'bg-green-100 text-green-700 ring-green-300';
      case 'pro':
        return 'bg-purple-100 text-purple-700 ring-purple-300';
      case 'business':
        return 'bg-orange-100 text-orange-700 ring-orange-300';
      case 'agency':
        return 'bg-red-100 text-red-700 ring-red-300';
      default:
        return 'bg-gray-100 text-gray-700 ring-gray-300';
    }
  };

  const getTierLabel = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-choco-100 bg-cream-50/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-choco-400"
            aria-label="Go to homepage"
          >
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-choco-800 shadow-soft transition group-hover:bg-choco-900">
              <Image
                src="/branding/arilogo-optimized.png"
                alt="AriClear logo"
                width={36}
                height={36}
                priority
                className="object-contain"
              />
            </div>
            <span className="text-lg font-semibold tracking-tight text-choco-900">
              AriClear
            </span>
          </Link>

          {/* Desktop */}
          <nav className="hidden items-center gap-4 text-sm text-choco-700 md:flex">
            <Link 
              href="/#how-it-works" 
              className="hover:text-choco-900 transition"
            >
              How it works
            </Link>
            <Link 
              href="/#who-its-for" 
              className="hover:text-choco-900 transition"
            >
              Who it&apos;s for
            </Link>

            {/* Show these links only for authenticated users */}
            {user && (
              <>
                <Link
                  href="/scan"
                  className={`hover:text-choco-900 transition ${
                    isActive('/scan') ? 'font-semibold text-choco-900' : ''
                  }`}
                >
                  Scan
                </Link>
                <Link
                  href="/history"
                  className={`hover:text-choco-900 transition ${
                    isActive('/history') ? 'font-semibold text-choco-900' : ''
                  }`}
                >
                  History
                </Link>
              </>
            )}

            {/* Show Try Demo only for non-authenticated users */}
            {!user && (
              <button
                type="button"
                onClick={handleTryDemo}
                className="hover:text-choco-900 cursor-pointer transition"
              >
                Try demo
              </button>
            )}

            <Button
              className="px-4 py-1.5 text-xs"
              type="button"
              onClick={handleEarlyAccess}
            >
              Get early access
            </Button>

            {user ? (
              <div className="flex items-center gap-3">
                {/* Subscription Info */}
                {subscription && (
                  <div className="flex items-center gap-2 border-l border-choco-200 pl-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ${getTierBadgeColor(subscription.tier)}`}>
                      {getTierLabel(subscription.tier)}
                    </span>
                    <span className="text-xs text-choco-600">
                      {subscription.websites_used}/{subscription.websites_limit} sites
                    </span>
                  </div>
                )}
                
                <div className="text-xs text-choco-600 border-l border-choco-200 pl-3">
                  {user.email}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-choco-700 hover:text-choco-900 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="text-xs text-choco-700 hover:text-choco-900 transition"
              >
                Login
              </button>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-choco-200 bg-white/70 px-3 py-2 text-sm text-choco-900 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-choco-400 md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="text-lg leading-none">
              {mobileOpen ? "✕" : "☰"}
            </span>
          </button>
        </div>

        {/* Mobile panel */}
        {mobileOpen && (
          <div className="border-t border-choco-100 bg-cream-50/95 backdrop-blur-sm md:hidden">
            <nav className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-2 text-sm text-choco-800">
                <Link
                  href="/#how-it-works"
                  onClick={closeMobile}
                  className="rounded-xl px-3 py-2 hover:bg-white/70 transition"
                >
                  How it works
                </Link>
                <Link
                  href="/#who-its-for"
                  onClick={closeMobile}
                  className="rounded-xl px-3 py-2 hover:bg-white/70 transition"
                >
                  Who it&apos;s for
                </Link>

                {/* Show these links only for authenticated users */}
                {user ? (
                  <>
                    <Link
                      href="/scan"
                      onClick={closeMobile}
                      className={`rounded-xl px-3 py-2 hover:bg-white/70 transition ${
                        isActive('/scan') ? 'bg-white/70 font-semibold' : ''
                      }`}
                    >
                      🔍 Scan Website
                    </Link>
                    <Link
                      href="/history"
                      onClick={closeMobile}
                      className={`rounded-xl px-3 py-2 hover:bg-white/70 transition ${
                        isActive('/history') ? 'bg-white/70 font-semibold' : ''
                      }`}
                    >
                      📊 History
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleTryDemo}
                    className="rounded-xl px-3 py-2 hover:bg-white/70 cursor-pointer transition text-left"
                  >
                    Try demo
                  </button>
                )}

                <div className="pt-2">
                  <Button
                    type="button"
                    className="w-full justify-center"
                    onClick={handleEarlyAccess}
                  >
                    Get early access
                  </Button>
                </div>

                {/* User info with subscription */}
                {user && (
                  <div className="pt-2 px-3 py-3 bg-white/50 rounded-xl space-y-2">
                    <p className="text-xs text-choco-600">
                      Signed in as
                    </p>
                    <p className="text-xs font-medium text-choco-900 truncate">
                      {user.email}
                    </p>
                    
                    {subscription && (
                      <div className="flex items-center justify-between pt-2 border-t border-choco-200">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ${getTierBadgeColor(subscription.tier)}`}>
                            {getTierLabel(subscription.tier)}
                          </span>
                        </div>
                        <div className="text-xs text-choco-600">
                          {subscription.websites_used}/{subscription.websites_limit} websites
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  {user ? (
                    <button
                      type="button"
                      className="w-full rounded-full bg-white px-4 py-2 text-sm font-medium text-choco-900 ring-1 ring-choco-200 transition hover:bg-cream-50"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  ) : (
                    <Button
                      type="button"
                      className="w-full justify-center"
                      onClick={handleLogin}
                    >
                      Login / Sign up
                    </Button>
                  )}
                </div>
              </div>
            </nav>
          </div>
        )}
      </header>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="login"
      />
    </>
  );
}
