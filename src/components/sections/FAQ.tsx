"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Is this legal? Is it GDPR & FCRA compliant?",
    a: "Yes. We only aggregate publicly available information that individuals have themselves published on the open web. We never scrape private, gated, or paywalled content. We comply with GDPR, CCPA, and the FCRA: our service is not a consumer reporting agency and may not be used to determine eligibility for credit, insurance, employment, or housing. Any subject can request removal through our /claim opt-out tool.",
  },
  {
    q: "How do you avoid false positives?",
    a: "Every signal we surface is cross-referenced across at least two independent sources before it appears in a report. When an identifier (a name, a handle, a photo) can't be confidently tied back to the same person, we suppress it rather than guess. We'd rather show you a partial, accurate profile than a complete, wrong one.",
  },
  {
    q: "What does 'registered accounts' mean?",
    a: "For supported platforms, we can tell you whether a given email has been used to sign up for an account — even if that account is private, dormant, or has no public profile. This is one of our most-requested signals for fraud and security teams.",
  },
  {
    q: "Do you store the emails I search?",
    a: "Search inputs are kept only long enough to deliver results and generate your recent-search history (for logged-in users). You can delete individual searches or purge your full history at any time from the dashboard. We never resell search queries or report contents to third parties.",
  },
  {
    q: "What does the REST API cover?",
    a: "Pro and Business plans can call the same deep-search endpoint our dashboard uses, returning structured JSON for any email. Rate limits are tied to your daily search quota. Business plans also get the bulk-search endpoint and webhook callbacks for async processing.",
  },
  {
    q: "Can I export results?",
    a: "Yes. CSV and XLSX exports are available on every paid plan. Branded PDF reports — useful for due-diligence packs and client deliverables — are available on Business and Enterprise plans.",
  },
  {
    q: "What happens if I cancel?",
    a: "You keep access until the end of your current billing period. After that, your saved searches and API keys are retained for 30 days in case you decide to return, then permanently deleted. No further charges.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-primary">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            Questions, answered.
          </h2>
        </div>

        <div className="mt-10">
          <Accordion type="single" collapsible className="w-full space-y-3">
            {FAQS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="rounded-xl glass px-5 border-none"
              >
                <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-5">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-text-accent leading-relaxed pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
