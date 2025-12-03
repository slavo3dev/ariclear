"use client";

import { FormEvent, useState } from "react";
import { Button } from "@ariclear/components";

export function PreorderForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePreorder = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setSubmitted(false);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setEmail("");
      setUrl("");
      onSuccess?.();
    }, 800);
  };

  return (
    <form
      onSubmit={handlePreorder}
      className="w-full max-w-lg space-y-6 rounded-2xl bg-choco-900 p-6 shadow-xl ring-1 ring-choco-700"
    >
      {/* Header */}
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-choco-800 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-choco-200">
          <span className="h-1.5 w-1.5 rounded-full bg-choco-400" />
          Early access · Limited alpha
        </p>

        <h2 className="text-xl font-semibold text-cream-50 sm:text-2xl">
          Get early access to AriClear
        </h2>

        <p className="text-xs leading-relaxed text-choco-200">
          AriClear analyzes your homepage like a first-time visitor and like an
          AI model. Join the alpha to see if humans and AI actually understand
          what your website does.
        </p>
      </div>

      {/* Email + CTA */}
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300"
        >
          Work email
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@startup.com"
            className="w-full rounded-full border border-choco-700 bg-choco-800 px-4 py-2 text-sm text-cream-50 placeholder:text-choco-400 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400"
          />

          <Button
            type="submit"
            className="shrink-0 sm:px-6"
            disabled={loading}
          >
            {loading ? "Saving..." : "Reserve my spot"}
          </Button>
        </div>
      </div>

      {/* Optional URL */}
      <div className="space-y-2">
        <label
          htmlFor="homepage"
          className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300"
        >
          Homepage URL (optional)
        </label>
        <input
          id="homepage"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourhomepage.com"
          className="w-full rounded-full border border-choco-700 bg-choco-800 px-4 py-2 text-xs text-cream-50 placeholder:text-choco-400 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400"
        />
        <p className="text-[11px] text-choco-300">
          If you share it now, AriClear can use your real homepage in the first
          human + AI clarity and AI-SEO tests.
        </p>
      </div>

      {/* Submitted message */}
      {submitted && (
        <p className="rounded-xl bg-choco-800 px-3 py-2 text-[12px] font-medium text-cream-100">
          ✅ You&apos;re in. Ari will reach out with your first human + AI
          website read once the private alpha goes live.
        </p>
      )}
    </form>
  );
}
