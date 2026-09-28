import { Mail, Cpu, FileCheck2 } from "lucide-react";

const STEPS = [
  {
    icon: Mail,
    step: "01",
    title: "Submit an email",
    desc:
      "Paste a single email — or upload a CSV for bulk processing. We never store the contents of your searches longer than needed to deliver results.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "We correlate the open web",
    desc:
      "Our engine queries 10+ platforms in parallel, cross-references identifiers, and discards ambiguous matches. Conservative by design: no false positives.",
  },
  {
    icon: FileCheck2,
    step: "03",
    title: "Receive a structured profile",
    desc:
      "Get back a clean, structured identity report with source links for every field. Export to CSV, XLSX, or branded PDF in one click.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-primary">
            How it works
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            From an email to a verified profile in under a minute.
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="relative rounded-2xl glass p-7 lift-on-hover"
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 ring-1 ring-brand-primary/25">
                    <Icon className="h-5 w-5 text-brand-primary" />
                  </div>
                  <span className="text-xs font-mono text-text-accent/70">{s.step}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-text-accent leading-relaxed">{s.desc}</p>

                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 h-px w-6 bg-gradient-to-r from-brand-primary/40 to-transparent" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
