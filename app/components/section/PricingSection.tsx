"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, PreorderForm } from "@ariclear/components";

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with clarity analysis",
    features: [
      "1 website",
      "Unlimited scans per website",
      "Full history tracking",
      "Basic PDF reports",
      "Email support",
    ],
    cta: "Start Free",
    highlighted: false,
    websites: 1,
  },
  {
    name: "Starter",
    price: "$249",
    period: "per year",
    description: "Annual clarity consultation",
    features: [
      "5 websites tracked",
      "Unlimited scans per website",
      "Full history tracking",
      "Advanced PDF reports",
      "Monthly progress reviews",
      "Comparison charts",
      "Priority email support",
      "Export to CSV",
    ],
    cta: "Contact for Info",
    highlighted: false,
    websites: 5,
    badge: "60-day trial available",
  },
  {
    name: "Pro",
    price: "$799",
    period: "per year",
    description: "Full-service clarity consulting",
    features: [
      "15 websites tracked",
      "Unlimited scans",
      "Quarterly strategy sessions",
      "Premium PDF reports",
      "Dedicated support channel",
      "Comparison & trend analysis",
      "API access",
      "Custom recommendations",
      "Export to CSV",
    ],
    cta: "Contact for Info",
    highlighted: true,
    badge: "Most Popular",
    websites: 15,
  },
];

export function PricingSection() {
  const router = useRouter();
  const [showTrialModal, setShowTrialModal] = useState(false);

  const handleSelectPlan = (planName: string) => {
    if (planName === "Free") {
      router.push("/scan");
    } else {
      // Open contact/trial modal
      setShowTrialModal(true);
    }
  };

  return (
    <section className="py-16 bg-cream-50" id="pricing">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-choco-900 sm:text-4xl">
            Annual clarity consulting
          </h2>
          <p className="mt-4 text-lg text-choco-700">
            Yearly engagement with ongoing support. This isn&apos;t just a tool—it&apos;s clarity consulting.
          </p>
          <p className="mt-2 text-sm text-choco-600">
            Request a 60-day trial with up to 5 websites to test the full platform.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-3 md:grid-cols-2">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 shadow-soft transition hover:shadow-md ${
                plan.highlighted
                  ? "border-choco-900 bg-white ring-2 ring-choco-900"
                  : "border-choco-100 bg-white"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="rounded-full bg-choco-900 px-4 py-1 text-xs font-medium text-cream-50">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan Name */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-choco-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-choco-600">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-choco-900">
                    {plan.price}
                  </span>
                  <span className="text-sm text-choco-600">
                    /{plan.period}
                  </span>
                </div>
                {plan.price !== "$0" && (
                  <p className="mt-2 text-xs text-choco-500">
                    Billed annually · Includes year-round support
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="mb-8 flex-1 space-y-4">
                {plan.features.map((feature, idx) => {
                  const isComingSoon = feature.includes("API") || 
                                       feature.includes("Export to CSV") ||
                                       feature.includes("Comparison");
                  
                  return (
                    <li key={idx} className="flex items-start gap-3 text-sm text-choco-700">
                      <span className="text-green-600 mt-0.5 shrink-0">✓</span>
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
                className={`w-full justify-center ${
                  plan.highlighted
                    ? ""
                    : "bg-cream-100 text-choco-900 hover:bg-cream-200 ring-1 ring-choco-200"
                }`}
                onClick={() => handleSelectPlan(plan.name)}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Why Annual */}
        <div className="mt-16 rounded-2xl border border-choco-100 bg-white p-8 text-center">
          <h3 className="text-xl font-bold text-choco-900 mb-4">
            Why annual consulting?
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-choco-700">
            <div>
              <div className="text-2xl mb-2">📊</div>
              <p className="font-semibold text-choco-900 mb-1">Long-term tracking</p>
              <p>Website clarity improves over months, not days. Track real progress.</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🎯</div>
              <p className="font-semibold text-choco-900 mb-1">Strategic support</p>
              <p>Regular check-ins and strategy sessions to ensure you&apos;re on track.</p>
            </div>
            <div>
              <div className="text-2xl mb-2">💰</div>
              <p className="font-semibold text-choco-900 mb-1">Better value</p>
              <p>One year of consulting for less than most agencies charge per month.</p>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-choco-900 text-center mb-8">
            What&apos;s included
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-2xl overflow-hidden shadow-soft">
              <thead>
                <tr className="border-b-2 border-choco-200 bg-cream-50">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-choco-900">
                    Feature
                  </th>
                  {pricingPlans.map((plan) => (
                    <th
                      key={plan.name}
                      className="text-center py-4 px-6 text-sm font-semibold text-choco-900"
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-choco-100">
                  <td className="py-4 px-6 font-medium text-choco-700">Websites tracked</td>
                  {pricingPlans.map((plan) => (
                    <td key={plan.name} className="text-center py-4 px-6 text-choco-900 font-semibold">
                      {plan.websites}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-choco-100">
                  <td className="py-4 px-6 font-medium text-choco-700">Scans per website</td>
                  {pricingPlans.map((plan) => (
                    <td key={plan.name} className="text-center py-4 px-6 text-choco-900">
                      Unlimited
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-choco-100">
                  <td className="py-4 px-6 font-medium text-choco-700">Strategy sessions</td>
                  {pricingPlans.map((plan) => (
                    <td key={plan.name} className="text-center py-4 px-6">
                      {plan.features.some((f) => f.includes("session") || f.includes("review")) ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-choco-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-choco-100">
                  <td className="py-4 px-6 font-medium text-choco-700">History tracking</td>
                  {pricingPlans.map((plan) => (
                    <td key={plan.name} className="text-center py-4 px-6">
                      <span className="text-green-600">✓</span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-choco-100">
                  <td className="py-4 px-6 font-medium text-choco-700">
                    PDF reports
                  </td>
                  {pricingPlans.map((plan) => (
                    <td key={plan.name} className="text-center py-4 px-6">
                      <span className="text-green-600">✓</span>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-choco-100">
                  <td className="py-4 px-6 font-medium text-choco-700">
                    API access
                    <span className="ml-2 text-[10px] text-yellow-700">coming soon</span>
                  </td>
                  {pricingPlans.map((plan) => (
                    <td key={plan.name} className="text-center py-4 px-6">
                      {plan.features.some((f) => f.includes("API")) ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-choco-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-choco-600 mb-4">
            Want to try before committing?{" "}
            <button
              onClick={() => setShowTrialModal(true)}
              className="font-medium text-choco-900 underline hover:text-choco-700"
            >
              Request a 60-day trial
            </button>
          </p>
          <p className="text-xs text-choco-500">
            Questions?{" "}
            <a
              href="mailto:support@ariclear.com"
              className="font-medium text-choco-900 underline hover:text-choco-700"
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
              className="absolute -top-3 -right-3 bg-choco-900 text-cream-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-choco-800 transition z-10"
              aria-label="Close modal"
            >
              ✕
            </button>
            <PreorderForm onSuccess={() => setShowTrialModal(false)} />
          </div>
        </div>
      )}
    </section>
  );
}