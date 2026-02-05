"use client";

import { useEffect, useState, useRef } from "react";
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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setUserDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };

    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userDropdownOpen]);

  // Fetch subscription when user logs in
  useEffect(() => {
    if (!user) {
      queueMicrotask(() => setSubscription(null));
      return;
    }

    let isMounted = true;

    const fetchSubscription = async () => {
      try {
        const res = await fetch("/api/subscription");
        if (!res.ok) {
          console.error('Failed to fetch subscription:', res.status);
          return;
        }

        const data = await res.json();

        if (isMounted) {
          queueMicrotask(() => {
            if (isMounted) {
              setSubscription(data);
            }
          });
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      }
    };

    fetchSubscription();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const closeMobile = () => setMobileOpen(false);
  const closeDropdown = () => setUserDropdownOpen(false);

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
    closeDropdown();
    await signOut();
    setSubscription(null);
    router.push("/");
  };

  const handleEarlyAccess = () => {
    closeMobile();
    openPreorderModal();
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const getTierBadgeColor = (tier?: string) => {
    if (!tier) return 'bg-gray-100 text-gray-700 ring-gray-300';
    
    switch (tier.toLowerCase()) {
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

  const getTierLabel = (tier?: string) => {
    if (!tier) return 'Free';
    return tier.charAt(0).toUpperCase() + tier.slice(1);
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
              Request Trial
            </Button>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                {/* User Dropdown Trigger */}
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 rounded-xl border border-choco-200 bg-white/70 px-3 py-2 text-xs hover:bg-white transition focus:outline-none focus:ring-2 focus:ring-choco-400"
                >
                  <div className="flex items-center gap-2">
                    {/* User Avatar/Initial */}
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-choco-800 text-white text-xs font-semibold">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[120px] truncate text-choco-900">
                      {user.email?.split('@')[0]}
                    </span>
                  </div>
                  <svg
                    className={`h-4 w-4 text-choco-600 transition-transform ${
                      userDropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl border border-choco-200 bg-white shadow-lg overflow-hidden">
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-choco-100 bg-cream-50/50">
                      <p className="text-xs text-choco-600 mb-1">Signed in as</p>
                      <p className="text-sm font-medium text-choco-900 truncate">
                        {user.email}
                      </p>
                      
                      {/* Subscription Info */}
                      {subscription && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ${getTierBadgeColor(subscription.tier)}`}>
                              {getTierLabel(subscription.tier)}
                            </span>
                            <span className="text-xs text-choco-600">
                              {subscription.websites_used}/{subscription.websites_limit} sites
                            </span>
                          </div>
                          
                          {/* Usage Bar */}
                          <div className="w-full bg-choco-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${getUsageColor()}`}
                              style={{ width: `${getUsagePercentage()}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Navigation Links */}
                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={closeDropdown}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream-50 transition ${
                          isActive('/dashboard') ? 'bg-cream-50 text-choco-900 font-medium' : 'text-choco-700'
                        }`}
                      >
                        <span className="text-base">📊</span>
                        <span>Dashboard</span>
                      </Link>

                      <Link
                        href="/scan"
                        onClick={closeDropdown}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream-50 transition ${
                          isActive('/scan') ? 'bg-cream-50 text-choco-900 font-medium' : 'text-choco-700'
                        }`}
                      >
                        <span className="text-base">🔍</span>
                        <span>New Scan</span>
                        {subscription?.can_scan && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-green-500" title="Ready to scan" />
                        )}
                      </Link>

                      <Link
                        href="/history"
                        onClick={closeDropdown}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-cream-50 transition ${
                          isActive('/history') ? 'bg-cream-50 text-choco-900 font-medium' : 'text-choco-700'
                        }`}
                      >
                        <span className="text-base">📜</span>
                        <span>History</span>
                      </Link>

                      <div className="border-t border-choco-100 my-1" />

                      <button
                        type="button"
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-choco-700 hover:bg-cream-50 transition"
                        onClick={() => {
                          closeDropdown();
                          // Add settings functionality here
                          console.log('Settings clicked');
                        }}
                      >
                        <span className="text-base">⚙️</span>
                        <span>Settings</span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-choco-100 py-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <span className="text-base">🚪</span>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
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
                    <div className="pt-2 pb-1 px-3">
                      <p className="text-xs text-choco-600 uppercase tracking-wide font-semibold">
                        Your Account
                      </p>
                    </div>
                    
                    <Link
                      href="/dashboard"
                      onClick={closeMobile}
                      className={`rounded-xl px-3 py-2 hover:bg-white/70 transition ${
                        isActive('/dashboard') ? 'bg-white/70 font-semibold' : ''
                      }`}
                    >
                      📊 Dashboard
                    </Link>
                    <Link
                      href="/scan"
                      onClick={closeMobile}
                      className={`rounded-xl px-3 py-2 hover:bg-white/70 transition ${
                        isActive('/scan') ? 'bg-white/70 font-semibold' : ''
                      }`}
                    >
                      🔍 New Scan
                    </Link>
                    <Link
                      href="/history"
                      onClick={closeMobile}
                      className={`rounded-xl px-3 py-2 hover:bg-white/70 transition ${
                        isActive('/history') ? 'bg-white/70 font-semibold' : ''
                      }`}
                    >
                      📜 History
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        closeMobile();
                        console.log('Settings clicked');
                      }}
                      className="rounded-xl px-3 py-2 hover:bg-white/70 transition text-left"
                    >
                      ⚙️ Settings
                    </button>
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
                    Request Trial
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
                      <>
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
                        
                        {/* Usage Bar for Mobile */}
                        <div className="w-full bg-choco-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${getUsageColor()}`}
                            style={{ width: `${getUsagePercentage()}%` }}
                          />
                        </div>
                      </>
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