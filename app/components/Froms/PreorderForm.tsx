/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import type { FormEventHandler } from "react";
import { Button } from "@ariclear/components";
import { preorderRequest } from "@ariclear/helpers";
import { toast } from "react-hot-toast";

export function PreorderForm({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [websites, setWebsites] = useState("3");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePreorder: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setSubmitted(false);

    try {
      // Pass data that matches PreorderPayload type
      await preorderRequest({ 
        email, 
        url: url || undefined, // Only pass if not empty
        // If your preorderRequest doesn't support requestedWebsites, 
        // you'll need to update the API or remove this field
      });

      setTimeout(() => {
        setLoading(false);
        setSubmitted(true);
        setEmail("");
        setUrl("");
        toast.success("Request submitted! We'll reach out within 24 hours.");
        onSuccess?.();
      }, 800);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";

      if (message === "EMAIL_EXISTS") {
        toast("You've already requested access 👀", {
          icon: "ℹ️",
        });
      } else {
        toast.error("Something went wrong. Please try again.");
      }

      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handlePreorder}
      className="w-full max-w-lg space-y-6 rounded-2xl bg-choco-900 p-6 shadow-xl ring-1 ring-choco-700"
    >
      {/* Header */}
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-choco-800 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-choco-200">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          60-Day Trial · Up to 5 Websites
        </p>

        <h2 className="text-xl font-semibold text-cream-50 sm:text-2xl">
          Request trial access
        </h2>

        <p className="text-xs leading-relaxed text-choco-200">
          Get 60 days to track up to 5 websites. We'll review your request and 
          set you up with extended access to test AriClear's human + AI clarity analysis.
        </p>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300"
        >
          Work email
        </label>

        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-full border border-choco-700 bg-choco-800 px-4 py-2 text-sm text-cream-50 placeholder:text-choco-400 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400"
        />
      </div>

      {/* Website Count */}
      <div className="space-y-2">
        <label
          htmlFor="websites"
          className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300"
        >
          How many websites do you need to track?
        </label>
        <select
          id="websites"
          value={websites}
          onChange={(e) => setWebsites(e.target.value)}
          className="w-full rounded-full border border-choco-700 bg-choco-800 px-4 py-2 text-sm text-cream-50 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400"
        >
          <option value="1">1 website</option>
          <option value="2">2 websites</option>
          <option value="3">3 websites</option>
          <option value="4">4 websites</option>
          <option value="5">5 websites</option>
        </select>
      </div>

      {/* Optional URL */}
      <div className="space-y-2">
        <label
          htmlFor="homepage"
          className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300"
        >
          Primary website URL (optional)
        </label>
        <input
          id="homepage"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourwebsite.com"
          className="w-full rounded-full border border-choco-700 bg-choco-800 px-4 py-2 text-xs text-cream-50 placeholder:text-choco-400 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400"
        />
        <p className="text-[11px] text-choco-300">
          We'll run your first scan to show you what AriClear can do.
        </p>
      </div>

      {/* CTA */}
      <Button type="submit" className="w-full justify-center" disabled={loading}>
        {loading ? "Submitting..." : "Request 60-day trial"}
      </Button>

      {/* Submitted message */}
      {submitted && (
        <div className="rounded-xl bg-green-900/30 border border-green-700 px-4 py-3 text-[12px] text-cream-100">
          <p className="font-medium mb-1">✅ Request submitted!</p>
          <p className="text-choco-200">
            We'll review your request and reach out within 24 hours to set up your 
            60-day trial with up to {websites} website{websites !== "1" ? "s" : ""}.
          </p>
        </div>
      )}

      {/* Terms */}
      <p className="text-[10px] text-choco-400 text-center">
        Trial includes full access to all features. No credit card required.
      </p>
    </form>
  );
}