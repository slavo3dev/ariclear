"use client";

import { FormEvent, useState } from "react";
import { Button, HeroPreviewCard } from "@ariclear/components";

export function HeroSection() {
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePreorder = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setSubmitted(false);

    try {
      const res = await fetch("/api/preorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, url }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error("Preorder error:", json);
        setLoading(false);
        return;
      }

      setTimeout(() => {
        setLoading(false);
        setSubmitted(true);
        setEmail("");
        setUrl("");
      }, 800);
    } catch (error) {
      console.error("Network error:", error);
      setLoading(false);
    }
  };

  return (
    <section className="bg-gradient-to-b from-cream-50 to-cream-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:py-20 lg:px-8">
        {/* Left copy */}
        <div className="flex-1 space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-choco-100 bg-cream-50 px-3 py-1 text-xs font-medium text-choco-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-choco-500" />
            Early access • Limited alpha
          </p>

          <h1 className="font-display text-4xl tracking-tight text-choco-900 sm:text-5xl lg:text-6xl">
            Does your website make sense{" "}
            <span className="text-choco-600">to humans and to AI?</span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-choco-700 sm:text-lg">
            AriClear analyzes your homepage like a first-time visitor and like
            an AI model. It shows whether people understand what you do in about
            10 seconds—and whether AI can correctly read, classify, and use your
            content.
          </p>

          <ul className="space-y-2 text-sm text-choco-700">
            <li>• Human 10-second clarity score (0–100)</li>
            <li>• What a new visitor thinks you actually do</li>
            <li>• How AI interprets and summarizes your website</li>
            <li>• Suggested hero copy that works for humans and AI SEO</li>
          </ul>

          {/* Pre-order / waitlist CTA */}
          <div id="preorder" className="pt-4">
            <form
              onSubmit={handlePreorder}
              className="w-full max-w-xl space-y-3 rounded-2xl bg-white/80 p-4 shadow-soft ring-1 ring-choco-100 backdrop-blur"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1 space-y-2">
                  <label
                    htmlFor="email"
                    className="text-xs font-medium uppercase tracking-[0.12em] text-choco-600"
                  >
                    Get early access to AriClear
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@startup.com"
                    className="w-full rounded-full border border-choco-200 bg-cream-50 px-4 py-2 text-sm text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-1 focus:ring-choco-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="shrink-0 sm:mt-5 sm:px-6"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Reserve my spot"}
                </Button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Optional: your homepage URL"
                  className="w-full rounded-full border border-dashed border-choco-200 bg-cream-50 px-4 py-2 text-xs text-choco-900 placeholder:text-choco-400 focus:border-choco-500 focus:outline-none focus:ring-1 focus:ring-choco-500"
                />
              </div>

              <p className="text-[11px] text-choco-500">
                You&apos;ll be among the first to see how AriClear reads your
                homepage—both as a human visitor and as an AI.
              </p>

              {submitted && (
                <p className="text-xs font-medium text-choco-700">
                  ✅ You&apos;re in. Ari will reach out once the private alpha
                  is ready.
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Right: preview card */}
        <HeroPreviewCard />
      </div>
    </section>
  );
}
