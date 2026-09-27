"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type Plan = {
  name: string;
  monthly: number;
  annual: number; // per month when billed annually
  searches: string;
  highlight?: boolean;
  badge?: string;
  cta: string;
  features: string[];
  excludes?: string[];
};

const PLANS: Plan[] = [
  {
    name: "Plus",
    monthly: 14.99,
    annual: 11.99,
    searches: "100 / day",
    cta: "Start with Plus",
    features: [
      "Full identity profiles",
      "Export to CSV / XLSX",
      "Saved searches & history",
      "Standard support",
    ],
    excludes: ["API access", "Breach exposure", "Bulk search", "PDF reports"],
  },
  {
    name: "Pro",
    monthly: 29.99,
    annual: 23.99,
    searches: "200 / day",
    highlight: true,
    badge: "Most Popular",
    cta: "Start with Pro",
    features: [
      "Everything in Plus",
      "REST API access",
      "Data-breach results",
      "Priority support",
    ],
  },
  {
    name: "Business",
    monthly: 99.99,
    annual: 79.99,
    searches: "1,000 / day",
    cta: "Start with Business",
    features: [
      "Everything in Pro",
      "Bulk search queue",
      "Branded PDF reports",
      "Team seats (up to 5)",
    ],
  },
  {
    name: "Enterprise",
    monthly: 0,
    annual: 0,
    searches: "Unlimited",
    cta: "Contact sales",
    features: [
      "Everything in Business",
      "SSO / SAML",
      "Dedicated success manager",
      "Custom data sources",
    ],
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="py-20 sm:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-primary/[0.03] to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-primary">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            Plans that scale with your research volume.
          </h2>
          <p className="mt-4 text-text-accent">
            Start with a single search. Upgrade when you need API access, breach data, or bulk
            processing. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full glass px-1 py-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
                !annual ? "bg-brand-primary text-[#081016] font-semibold" : "text-text-accent"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
                annual ? "bg-brand-primary text-[#081016] font-semibold" : "text-text-accent"
              }`}
            >
              Annual
              <span className="ml-1.5 text-[10px] opacity-80">save 20%</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {PLANS.map((p) => {
            const price = annual ? p.annual : p.monthly;
            return (
              <div
                key={p.name}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  p.highlight
                    ? "bg-brand-primary/[0.06] ring-2 ring-brand-primary/50 shadow-xl shadow-brand-primary/10"
                    : "glass"
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-brand-primary px-2.5 py-0.5 text-[10px] font-semibold text-[#081016]">
                    {p.badge}
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{p.name}</h3>
                </div>

                <div className="mt-3">
                  {price === 0 ? (
                    <p className="text-2xl font-bold">Custom</p>
                  ) : (
                    <>
                      <p className="text-3xl font-bold tracking-tight">
                        ${price.toFixed(2)}
                        <span className="text-sm font-normal text-text-accent"> /mo</span>
                      </p>
                      <p className="text-[11px] text-text-accent mt-0.5">
                        {annual ? "billed annually" : "billed monthly"}
                      </p>
                    </>
                  )}
                </div>

                <p className="mt-3 text-xs text-brand-primary font-medium">
                  {p.searches} searches
                </p>

                <ul className="mt-5 space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-text-primary">
                      <Check className="h-3.5 w-3.5 text-brand-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                  {p.excludes?.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-xs text-text-accent/50 line-through"
                    >
                      <span className="h-3.5 w-3.5 mt-0.5 shrink-0 inline-flex items-center justify-center">
                        <span className="h-px w-2 bg-text-accent/40" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-6 w-full py-2.5 rounded-lg text-sm font-medium ${
                    p.highlight ? "btn-brand" : "glass hover:border-brand-primary/40"
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-text-accent">
          All plans include GDPR &amp; CCPA compliance, profile opt-out tools, and Stripe-secured
          billing.
        </p>
      </div>
    </section>
  );
}
