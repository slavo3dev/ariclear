"use client";

import { Button, usePreorder } from "@ariclear/components";

interface PricingCardProps {
  label: string;
  name: string;
  price: string;
  sublabel?: string;
  description: string;
  features: string[];
  highlight?: boolean;
  onClick: () => void;
}

function PricingCard({
  label,
  name,
  price,
  sublabel,
  description,
  features,
  highlight,
  onClick,
}: PricingCardProps) {
  return (
    <div
      className={[
        "flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-soft",
        highlight
          ? "border-choco-400 ring-1 ring-choco-300"
          : "border-choco-100",
      ].join(" ")}
    >
      {/* Label / Badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-cream-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-choco-600">
          {label}
        </span>
        {highlight && (
          <span className="rounded-full bg-choco-900 px-3 py-1 text-[11px] font-medium text-cream-50">
            Best for indie builders
          </span>
        )}
      </div>

      {/* Name + description */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-choco-900">{name}</h3>
        <p className="text-xs text-choco-700">{description}</p>
      </div>

      {/* Price */}
      <div className="space-y-1">
        <p className="text-2xl font-semibold text-choco-900">
          {price}
          {price !== "Free" && (
            <span className="text-xs font-normal text-choco-600"> /month</span>
          )}
        </p>
        {sublabel && (
          <p className="text-[11px] text-choco-600">{sublabel}</p>
        )}
      </div>

      {/* Features */}
      <ul className="flex flex-1 list-disc flex-col gap-1 pl-4 text-xs text-choco-700">
        {features.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        type="button"
        className="mt-2 w-full justify-center"
        onClick={onClick}
      >
        {price === "Free" ? "Start with Starter" : "Get Solo Builder"}
      </Button>
    </div>
  );
}

export function PricingSection () {
  
  const { open } = usePreorder();

  return (
    <section
      id="pricing"
      className="border-t border-choco-100 bg-cream-50"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-choco-600">
            Pricing
          </p>
          <h2 className="text-2xl font-semibold text-choco-900 sm:text-3xl">
            Start free. Upgrade when clarity becomes your unfair advantage.
          </h2>
          <p className="text-sm text-choco-700">
            Launch AriClear with a simple two-plan model: a free Starter plan to
            get as many websites as possible through their first clarity test,
            and a Solo Builder plan for people who want deeper analysis and AI
            helper tools.
          </p>
        </div>

        {/* 2 main plans */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <PricingCard
            label="Starter"
            name="Starter (Free)"
            price="Free"
            description="Perfect for trying AriClear on your main homepage and seeing the human + AI clarity scores in action."
            features={[
              "1 website",
              "Human clarity score (10-second test)",
              "AI SEO readability score",
              "Basic suggestions to improve clarity",
              "Basic AI prompt to rewrite your hero headline",
              "Up to 3 scans per month",
            ] }
            onClick={open}
          />

          <PricingCard
            label="Solo"
            name="Solo Builder"
            price="$29"
            sublabel="Early-access founders deal: higher limits, lower price while in alpha."
            description="For solopreneurs and indie makers who want to test multiple projects and ship clearer messaging faster."
            features={[
              "Up to 5 websites",
              "Unlimited scans during early access",
              "Full human + AI clarity analytics",
              "In-depth suggestions to improve copy and structure",
              "AI-generated hero + subheadline suggestions",
              "AI SEO meta title & description suggestions",
              "Prompt-ready AI wording so models can ‘get’ your site",
              "Exportable reports for yourself or clients",
            ]}
            highlight
            onClick={open}
          />
        </div>

        {/* Coming soon row */}
        <div className="mt-8 rounded-2xl border border-dashed border-choco-200 bg-white/70 p-4 text-xs text-choco-700 sm:flex sm:items-center sm:justify-between">
          <p className="font-medium text-choco-900">
            Coming soon: Marketing Team & Enterprise plans
          </p>
          <p className="mt-1 max-w-xl text-[11px] sm:mt-0">
            Designed for agencies, growth teams and larger companies that want
            to run AriClear across multiple client sites and full product
            portfolios.
          </p>
        </div>
      </div>
    </section>
  );
}
