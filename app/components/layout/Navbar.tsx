"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@ariclear/components";
import { usePreorder } from "@ariclear/components";
import Image from "next/image";

export function Navbar() {
  const { open } = usePreorder();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  const openPreorder = () => {
    closeMobile();
    open();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-choco-100 bg-cream-50/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo / Branding (clickable) */}
      <Link href="/"
          className="group inline-flex items-center gap-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-choco-400"
          aria-label="Go to homepage"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-choco-800 shadow-soft transition group-hover:bg-choco-900 overflow-hidden">
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

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-4 text-sm text-choco-700 md:flex">
          <a href="#how-it-works" className="hover:text-choco-900">
            How it works
          </a>
          <a href="#who-its-for" className="hover:text-choco-900">
            Who it&apos;s for
          </a>
          <Link href="/scan" className="hover:text-choco-900">
            Try demo
          </Link>

          <Button className="px-4 py-1.5 text-xs" type="button" onClick={open}>
            Get early access
          </Button>
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-choco-200 bg-white/70 px-3 py-2 text-sm text-choco-900 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-choco-400 md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? (
            <span className="text-lg leading-none">✕</span>
          ) : (
            <span className="text-lg leading-none">☰</span>
          )}
        </button>
      </div>

      {/* Mobile Navigation Panel */}
      {mobileOpen && (
        <div className="border-t border-choco-100 bg-cream-50/95 backdrop-blur-sm md:hidden">
          <nav className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 text-sm text-choco-800">
              <a
                href="#how-it-works"
                onClick={closeMobile}
                className="rounded-xl px-3 py-2 hover:bg-white/70"
              >
                How it works
              </a>
              <a
                href="#who-its-for"
                onClick={closeMobile}
                className="rounded-xl px-3 py-2 hover:bg-white/70"
              >
                Who it&apos;s for
              </a>
              <Link
                href="/scan"
                onClick={closeMobile}
                className="rounded-xl px-3 py-2 hover:bg-white/70"
              >
                Try demo
              </Link>

              <div className="pt-2">
                <Button
                  type="button"
                  className="w-full justify-center"
                  onClick={openPreorder}
                >
                  Get early access
                </Button>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
