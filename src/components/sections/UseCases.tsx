import { Target, ShieldCheck, Search, Building2 } from "lucide-react";

const USE_CASES = [
  {
    icon: Target,
    tag: "Sales & SDR",
    title: "Personalize outreach",
    desc:
      "Uncover public professional details before you hit send. Reference the right employer, the right role, the right shared interest — and skip the dead leads entirely.",
  },
  {
    icon: Search,
    tag: "Lead generation",
    title: "Enrich your pipeline",
    desc:
      "Append verified signals to every record in your CRM. Qualify leads faster, route them to the right rep, and stop wasting hours on manual research.",
  },
  {
    icon: ShieldCheck,
    tag: "Security & fraud",
    title: "Verify identities",
    desc:
      "Trace digital evidence, analyze threats, and map affiliations. Mitigate risk before onboarding a partner, vendor, or high-value account.",
  },
  {
    icon: Building2,
    tag: "Due diligence",
    title: "Background verification",
    desc:
      "Run defensible identity checks before contracts close. Every field in the report links back to a public source — auditable and exportable.",
  },
];

export default function UseCases() {
  return (
    <section id="use-cases" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-primary">
            Use cases
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            Built for teams that need answers, not noise.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {USE_CASES.map((u) => {
            const Icon = u.icon;
            return (
              <div key={u.title} className="rounded-2xl glass p-7 lift-on-hover">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 ring-1 ring-brand-primary/25">
                    <Icon className="h-5 w-5 text-brand-primary" />
                  </div>
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-brand-primary">
                      {u.tag}
                    </span>
                    <h3 className="mt-1 text-lg font-semibold">{u.title}</h3>
                    <p className="mt-2 text-sm text-text-accent leading-relaxed">{u.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
