import { Mail } from "lucide-react";

const LINKS = [
  {
    title: "Product",
    items: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Example report", href: "#example" },
      { label: "How it works", href: "#how-it-works" },
    ],
  },
  {
    title: "Use cases",
    items: [
      { label: "Sales & SDR", href: "#use-cases" },
      { label: "Lead generation", href: "#use-cases" },
      { label: "Security & fraud", href: "#use-cases" },
      { label: "Due diligence", href: "#use-cases" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "Contact", href: "#contact" },
      { label: "Privacy policy", href: "#privacy" },
      { label: "Terms of service", href: "#terms" },
      { label: "Opt-out / claim", href: "#claim" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#081016]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary/15 ring-1 ring-brand-primary/30">
                <Mail className="h-4 w-4 text-brand-primary" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight">
                Behind<span className="text-brand-primary">The</span>Email
              </span>
            </div>
            <p className="mt-4 text-sm text-text-accent max-w-sm leading-relaxed">
              Professional OSINT for lead research, identity verification, and digital footprint
              analysis. Conservative by design — no false positives.
            </p>
            <p className="mt-4 text-[11px] text-text-accent/70">
              © {new Date().getFullYear()} BehindTheEmail. All rights reserved.
            </p>
          </div>

          {LINKS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-accent/80">
                {group.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.items.map((it) => (
                  <li key={it.label}>
                    <a
                      href={it.href}
                      className="text-sm text-text-accent hover:text-brand-primary transition-colors"
                    >
                      {it.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-[11px] text-text-accent/70">
          <p>
            Not a consumer reporting agency. Not for use in FCRA-covered decisions (credit,
            insurance, employment, housing).
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a href="#privacy" className="hover:text-text-primary">Privacy</a>
            <a href="#terms" className="hover:text-text-primary">Terms</a>
            <a href="#claim" className="hover:text-text-primary">Opt-out</a>
            <a href="#contact" className="hover:text-text-primary">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
