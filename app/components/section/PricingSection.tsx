"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, PreorderForm } from "@ariclear/components";

const pricingPlans = [
  {
    name: "Founder Clarity",
    badge: "Free right now",
    medal: "⭐",
    price: "$39",
    period: "one-time · valid for 12 months",
    description: "A clarity check you can use anytime this year",
    tagline: '"Pay once. Get clarity when it matters."',
    features: [
      "Up to 3 websites",
      "Unlimited clarity scans",
      "Clarity score & breakdown",
      "Headline & value proposition feedback",
      "CTA clarity analysis",
      "PDF clarity reports",
      "Re-check after edits",
      "All updates included for 1 year",
    ],
    cta: "Start Free",
    highlighted: true,
    websites: 5,
    isFree: true,
  },
  {
    name: "Agency / Founder",
    badge: "For teams & consultants",
    medal: "🏆",
    price: "$99",
    period: "one-time · valid for 12 months",
    description: "Built for agencies managing multiple clients",
    tagline: '"Clarity as a professional service."',
    features: [
      "Up to 30 websites",
      "Unlimited scans",
      "Save & archive reports",
      "Shareable client reports",
      '"Ari explains WHY" mode',
      "Agency-ready PDF exports",
      "Priority support",
      "Early access to new features",
    ],
    cta: "Get Agency Access",
    highlighted: false,
    websites: "Unlimited",
    isFree: false,
  },
];

export function PricingSection() {
  const router = useRouter();
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showLifetimeModal, setShowLifetimeModal] = useState(false);

  const handleSelectPlan = (plan: (typeof pricingPlans)[0]) => {
    if (plan.isFree) {
      router.push("/scan");
    } else {
      setShowTrialModal(true);
    }
  };

  return (
    <section className="py-16 bg-linear-to-b from-cream-50 to-white" id="pricing">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-choco-900 sm:text-5xl mb-4">
            Choose your clarity plan
          </h2>
          <p className="text-lg text-choco-700 max-w-2xl mx-auto">
            Not a daily tool — one purchase, one year of clarity whenever you need it.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto mb-16">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border-2 p-8 transition-all duration-300 ${
                plan.highlighted
                  ? "border-choco-900 bg-white shadow-xl"
                  : "border-choco-200 bg-white shadow-md hover:shadow-lg hover:border-choco-300"
              }`}
            >
              {/* Medal & Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">{plan.medal}</span>
                {plan.badge && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      plan.isFree
                        ? "bg-green-100 text-green-800 ring-1 ring-green-300"
                        : "bg-cream-100 text-choco-800 ring-1 ring-choco-300"
                    }`}
                  >
                    {plan.badge}
                  </span>
                )}
              </div>

              {/* Plan Name */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-choco-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-sm text-choco-600 mb-3">{plan.description}</p>
                <p className="text-sm italic text-choco-500">{plan.tagline}</p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-3">
                  {plan.isFree ? (
                    <>
                      <span className="text-5xl font-bold text-green-700">Free</span>
                      <div className="flex flex-col">
                        <span className="text-sm text-choco-600">right now</span>
                        <span className="text-xs text-choco-500">
                          ({plan.price} when launched)
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-choco-900">
                        {plan.price}
                      </span>
                      <span className="text-sm text-choco-600">{plan.period}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature, idx) => {
                  const isComingSoon =
                    feature.includes("Agency-ready") ||
                    feature.includes("Shareable client") ||
                    feature.includes("Early access");

                  return (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-choco-700"
                    >
                      <span className="text-green-600 mt-0.5 shrink-0 text-base">
                        ✓
                      </span>
                      <span className="flex-1">
                        {feature}
                        {isComingSoon && (
                          <span className="ml-2 text-[10px] text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full ring-1 ring-yellow-200">
                            Coming soon
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* CTA */}
              <Button
                type="button"
                className={`w-full justify-center font-semibold transition-all duration-200 ${
                  plan.highlighted
                    ? "bg-choco-900 text-cream-50 hover:bg-choco-800 shadow-lg hover:shadow-xl"
                    : "bg-choco-800 text-cream-50 hover:bg-choco-700"
                }`}
                onClick={() => handleSelectPlan(plan)}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Lifetime Deal - Special Offer */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400 bg-linear-to-br from-amber-50 via-white to-orange-50 p-8 shadow-xl mb-16">
          {/* Corner badge */}
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-amber-400 rotate-45 flex items-end justify-center pb-16">
            <span className="text-white font-bold text-sm -rotate-45">
              LIMITED
            </span>
          </div>

          <div className="relative">
            <div className="flex items-start gap-6 flex-col md:flex-row">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-5xl">🔥</span>
                  <div>
                    <h3 className="text-3xl font-bold text-choco-900">
                      Lifetime Deal
                    </h3>
                    <p className="text-sm text-amber-700 font-semibold">
                      Early Adopters Only · First 100 Users
                    </p>
                  </div>
                </div>

                <p className="text-choco-700 mb-6 text-lg">
                  Get <strong>lifetime access</strong> to all features. Pay once, use forever — no renewals, no limits.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-amber-200">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-choco-900">
                        $399
                      </span>
                      <span className="text-sm text-choco-600">one-time</span>
                    </div>
                    <p className="text-xs text-choco-600">
                      vs. $99/year recurring
                    </p>
                  </div>
                  <div className="flex flex-col justify-center space-y-2">
                    <div className="flex items-center gap-2 text-sm text-choco-700">
                      <span className="text-green-600">✓</span>
                      <span>All features forever</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-choco-700">
                      <span className="text-green-600">✓</span>
                      <span>Priority email support</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-choco-700">
                      <span className="text-green-600">✓</span>
                      <span>All future updates included</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    className="bg-linear-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl font-bold px-8"
                    onClick={() => setShowLifetimeModal(true)}
                  >
                    Claim Lifetime Deal
                  </Button>
                  <div className="text-xs text-choco-600">
                    <div className="font-semibold">⏰ 47 spots remaining</div>
                    <div>Offer ends soon</div>
                  </div>
                </div>
              </div>

              <div className="md:w-64 bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-amber-200">
                <h4 className="font-bold text-choco-900 mb-3 text-center">
                  Why grab this?
                </h4>
                <ul className="space-y-3 text-sm text-choco-700">
                  <li className="flex items-start gap-2">
                    <span>💰</span>
                    <span>Pay less than 2 years of the standard plan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🔒</span>
                    <span>Lock in before prices go up</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>⭐</span>
                    <span>Use it anytime, forever</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🚀</span>
                    <span>Every new feature, included</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-choco-900 text-center mb-8">
            Compare plans
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-2xl overflow-hidden shadow-md">
              <thead>
                <tr className="border-b-2 border-choco-200 bg-cream-50">
                  <th className="text-left py-5 px-6 text-sm font-bold text-choco-900">
                    Feature
                  </th>
                  <th className="text-center py-5 px-6 text-sm font-bold text-choco-900 bg-cream-100">
                    <div>⭐</div>
                    <div className="mt-1">Founder Clarity</div>
                  </th>
                  <th className="text-center py-5 px-6 text-sm font-bold text-choco-900">
                    <div>🏆</div>
                    <div className="mt-1">Agency / Founder</div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-choco-100 hover:bg-cream-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-choco-700">
                    Price
                  </td>
                  <td className="text-center py-4 px-6 text-green-700 font-bold">
                    Free now · $39 at launch
                  </td>
                  <td className="text-center py-4 px-6 text-choco-900 font-semibold">
                    $99
                  </td>
                </tr>
                <tr className="border-b border-choco-100 hover:bg-cream-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-choco-700">
                    Websites
                  </td>
                  <td className="text-center py-4 px-6 text-choco-900 font-semibold">
                    5
                  </td>
                  <td className="text-center py-4 px-6 text-choco-900 font-semibold">
                    Unlimited
                  </td>
                </tr>
                <tr className="border-b border-choco-100 hover:bg-cream-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-choco-700">
                    Scans
                  </td>
                  <td className="text-center py-4 px-6 text-choco-900">
                    Unlimited
                  </td>
                  <td className="text-center py-4 px-6 text-choco-900">
                    Unlimited
                  </td>
                </tr>
                <tr className="border-b border-choco-100 hover:bg-cream-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-choco-700">
                    Clarity score & breakdown
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-green-600 text-lg">✓</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-green-600 text-lg">✓</span>
                  </td>
                </tr>
                <tr className="border-b border-choco-100 hover:bg-cream-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-choco-700">
                    CTA & headline feedback
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-green-600 text-lg">✓</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-green-600 text-lg">✓</span>
                  </td>
                </tr>
                <tr className="border-b border-choco-100 hover:bg-cream-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-choco-700">
                    PDF reports
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-green-600 text-lg">✓</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-green-600 text-lg">✓</span>
                  </td>
                </tr>
                <tr className="border-b border-choco-100 hover:bg-cream-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-choco-700">
                    Save & archive reports
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-choco-300">—</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-green-600 text-lg">✓</span>
                  </td>
                </tr>
                <tr className="border-b border-choco-100 hover:bg-cream-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-choco-700">
                    Shareable client reports
                    <span className="ml-2 text-[10px] text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
                      coming soon
                    </span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-choco-300">—</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-green-600 text-lg">✓</span>
                  </td>
                </tr>
                <tr className="border-b border-choco-100 hover:bg-cream-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-choco-700">
                    Ari explains WHY mode
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-choco-300">—</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-green-600 text-lg">✓</span>
                  </td>
                </tr>
                <tr className="border-b border-choco-100 hover:bg-cream-50/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-choco-700">
                    Priority support
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-choco-300">—</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="text-green-600 text-lg">✓</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-sm text-choco-600 mb-4">
            Questions?{" "}
            <a
              href="mailto:support@ariclear.com"
              className="font-semibold text-choco-900 underline hover:text-choco-700 transition-colors"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>

      {/* Trial Modal */}
      {showTrialModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-choco-900/70 backdrop-blur-sm p-4"
          onClick={() => setShowTrialModal(false)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTrialModal(false)}
              className="absolute -top-3 -right-3 bg-choco-900 text-cream-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-choco-800 transition-all duration-300 shadow-lg z-10"
              aria-label="Close modal"
            >
              ✕
            </button>
            <PreorderForm onSuccess={() => setShowTrialModal(false)} />
          </div>
        </div>
      )}

      {/* Lifetime Deal Modal */}
      {showLifetimeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-choco-900/70 backdrop-blur-sm p-4"
          onClick={() => setShowLifetimeModal(false)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLifetimeModal(false)}
              className="absolute -top-3 -right-3 bg-amber-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-amber-700 transition-all duration-300 shadow-lg z-10"
              aria-label="Close modal"
            >
              ✕
            </button>
            <PreorderForm onSuccess={() => setShowLifetimeModal(false)} />
          </div>
        </div>
      )}
    </section>
  );
}
