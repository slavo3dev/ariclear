"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, PreorderForm, useAuth, AuthModal } from "@ariclear/components";

const plans = [
  {
    id: "free",
    name: "Starter",
    badge: "Free forever",
    price: "Free",
    priceSub: null,
    description: "Run your first clarity scan in under 60 seconds.",
    features: [
      { text: "1 website", included: true, highlight: false },
      { text: "Unlimited clarity scans", included: true, highlight: false },
      { text: "Clarity score & breakdown", included: true, highlight: false },
      { text: "Headline & value proposition feedback", included: true, highlight: false },
      { text: "CTA clarity analysis", included: true, highlight: false },
      { text: "PDF clarity reports", included: true, highlight: false },
      { text: "3× expert sessions / month", included: false, highlight: false },
      { text: "Priority support", included: false, highlight: false },
    ],
    cta: "Start for free",
    isFree: true,
  },
  {
    id: "pro",
    name: "Pro + Expert",
    badge: "Most value",
    price: "$699",
    priceSub: "per year · cancel anytime",
    description: "AI clarity scans plus a real expert in your corner every week.",
    features: [
      { text: "Unlimited websites", included: true, highlight: false },
      { text: "Unlimited clarity scans", included: true, highlight: false },
      { text: "Clarity score & breakdown", included: true, highlight: false },
      { text: "Headline & value proposition feedback", included: true, highlight: false },
      { text: "CTA clarity analysis", included: true, highlight: false },
      { text: "PDF clarity reports + save & archive", included: true, highlight: false },
      {
        text: "3× 30-min 1-on-1 expert sessions / month",
        included: true,
        highlight: true,
      },
      { text: "Priority support", included: true, highlight: false },
    ],
    cta: "Get Pro + Expert",
    isFree: false,
  },
];

export function PricingSection() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [showPreorderModal, setShowPreorderModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSelect = (plan: (typeof plans)[0]) => {
    if (plan.isFree) {
      if (loading) return;
      if (user) {
        router.push("/dashboard");
      } else {
        setShowAuthModal(true);
      }
    } else {
      setShowPreorderModal(true);
    }
  };

  return (
    <section className="py-24 bg-white" id="pricing">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-choco-500 mb-3">
            Pricing
          </p>
          <h2 className="text-4xl font-bold text-choco-900 sm:text-5xl mb-4 tracking-tight">
            Start free. Scale with an expert.
          </h2>
          <p className="text-lg text-choco-600 max-w-xl mx-auto">
            Every plan includes unlimited scans. The Pro plan adds a real human
            who reviews your site with you — live.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 ${
                plan.isFree
                  ? "bg-cream-50 border-2 border-choco-100"
                  : "bg-choco-900 border-2 border-choco-900 shadow-2xl"
              }`}
            >
              {/* Badge */}
              <div className="mb-6 flex items-center justify-between">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                    plan.isFree
                      ? "bg-choco-100 text-choco-700"
                      : "bg-amber-400 text-choco-900"
                  }`}
                >
                  {plan.badge}
                </span>
              </div>

              {/* Name + description */}
              <h3
                className={`text-2xl font-bold mb-2 ${
                  plan.isFree ? "text-choco-900" : "text-cream-50"
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`text-sm mb-8 ${
                  plan.isFree ? "text-choco-600" : "text-white/70"
                }`}
              >
                {plan.description}
              </p>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-5xl font-bold tracking-tight ${
                      plan.isFree ? "text-choco-900" : "text-cream-50"
                    }`}
                  >
                    {plan.price}
                  </span>
                  {plan.priceSub && (
                    <span
                      className={`text-sm ${
                        plan.isFree ? "text-choco-500" : "text-white/60"
                      }`}
                    >
                      {plan.priceSub}
                    </span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="mb-10 flex-1 space-y-3">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span
                      className={`mt-0.5 shrink-0 text-base font-bold ${
                        f.included
                          ? plan.isFree
                            ? "text-green-600"
                            : "text-amber-400"
                          : "text-choco-300"
                      }`}
                    >
                      {f.included ? "✓" : "—"}
                    </span>
                    <span
                      className={`${
                        !f.included
                          ? plan.isFree
                            ? "text-choco-400"
                            : "text-white/40"
                          : f.highlight
                          ? plan.isFree
                            ? "text-choco-900 font-semibold"
                            : "text-amber-300 font-semibold"
                          : plan.isFree
                          ? "text-choco-700"
                          : "text-white"
                      }`}
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                type="button"
                onClick={() => handleSelect(plan)}
                disabled={loading}
                className={`w-full justify-center font-semibold py-3 rounded-xl transition-all duration-200 ${
                  plan.isFree
                    ? "bg-choco-900 text-cream-50 hover:bg-choco-800"
                    : "bg-amber-400 text-choco-900 hover:bg-amber-300 shadow-lg hover:shadow-xl"
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Trust line */}
        <p className="text-center text-sm text-choco-500 mt-10">
          Questions?{" "}
          <a
            href="mailto:support@ariclear.com"
            className="font-semibold text-choco-800 underline hover:text-choco-600 transition-colors"
          >
            Email us
          </a>{" "}
          — we reply fast.
        </p>
      </div>

      {/* Auth Modal — opens when unauthenticated user clicks free plan */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />

      {/* Preorder Modal — opens for Pro plan */}
      {showPreorderModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-choco-900/70 backdrop-blur-sm p-4"
          onClick={() => setShowPreorderModal(false)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPreorderModal(false)}
              className="absolute -top-3 -right-3 bg-choco-900 text-cream-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-choco-800 transition-all duration-300 shadow-lg z-10"
              aria-label="Close modal"
            >
              ✕
            </button>
            <PreorderForm onSuccess={() => setShowPreorderModal(false)} />
          </div>
        </div>
      )}
    </section>
  );
}