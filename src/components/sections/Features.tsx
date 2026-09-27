import {
  Search,
  Layers,
  ShieldAlert,
  FileDown,
  Code2,
  UserCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Deep Identity Search",
    desc:
      "Surface full name, job history, education, location, socials, photos, usernames, skills, interests and bio from a single email — correlated and deduplicated across sources.",
  },
  {
    icon: Layers,
    title: "Bulk Analysis",
    desc:
      "Queue dozens of emails at once. Watch the queue process in real time, then export the complete structured dataset to your favorite CRM or spreadsheet.",
  },
  {
    icon: ShieldAlert,
    title: "Breach Exposure",
    desc:
      "See which data breaches (LinkedIn 2021, Adobe 2019, Dropbox 2016, …) the email appeared in, with first- and last-seen dates for risk assessment.",
  },
  {
    icon: UserCheck,
    title: "Registered Accounts",
    desc:
      "Discover which platforms an email has actually signed up for. Confirm identity before you engage, not after a problem surfaces.",
  },
  {
    icon: FileDown,
    title: "Export Anything",
    desc:
      "Push results to CSV, XLSX or branded PDF reports (Business+). Embed them in due-diligence packs or share read-only links with stakeholders.",
  },
  {
    icon: Code2,
    title: "REST API",
    desc:
      "Programmatic access for Pro and Business plans. Enrich leads in your CRM, score signups in real time, or pipe alerts to your SOC without leaving your stack.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-primary/[0.02] to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-primary">
            Features
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            Built for professionals who can&apos;t afford to be wrong.
          </h2>
          <p className="mt-4 text-text-accent">
            Every feature is designed around a single principle: when you need to know who&apos;s
            behind an email, the answer has to be defensible. Conservative matching. Auditable
            sources. Clean exports.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-2xl glass p-6 lift-on-hover"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 ring-1 ring-brand-primary/25">
                  <Icon className="h-5 w-5 text-brand-primary" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-text-accent leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
