"use client";

import { Button } from "@ariclear/components";
import { usePreorder } from "@ariclear/components";

export function Navbar() {
  const { open } = usePreorder();

  return (
    <header className="sticky top-0 z-20 border-b border-choco-100 bg-cream-50/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

        {/* Logo / Branding */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-choco-800 text-cream-50 shadow-soft">
            <span className="text-lg font-semibold">A</span>
          </div>

          <span className="font-semibold tracking-tight text-choco-900 text-lg">
            AriClear
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-4 text-sm text-choco-700 md:flex">
          <a href="#how-it-works" className="hover:text-choco-900">
            How it works
          </a>

          <a href="#who-its-for" className="hover:text-choco-900">
            Who it&apos;s for
          </a>

          <Button
            className="px-4 py-1.5 text-xs"
            type="button"
            onClick={open}
          >
            Get early access
          </Button>
        </nav>
      </div>
    </header>
  );
}
