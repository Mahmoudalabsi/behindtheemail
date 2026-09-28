"use client";

import { useState } from "react";
import { ArrowRight, Search, Shield, Sparkles } from "lucide-react";

export default function Hero({ onSearch }: { onSearch: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!v || pending) return;
    setPending(true);
    // Brief visual feedback before handing off to LiveResults
    setTimeout(() => {
      onSearch(v);
      setPending(false);
    }, 250);
  };

  return (
    <section id="top" className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      <div className="absolute inset-0 hero-glow pointer-events-none" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-text-accent">
          <Sparkles className="h-3.5 w-3.5 text-brand-primary" />
          <span>Professional OSINT for email intelligence</span>
        </div>

        <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
          Turn any email into a{" "}
          <span className="text-brand-gradient">complete profile</span>.
        </h1>

        <p className="mt-5 mx-auto max-w-2xl text-base sm:text-lg text-text-accent leading-relaxed">
          Instantly find career history, education, and public profile signals from any
          email address. Conservative by design — we never produce false positives.
        </p>

        <form onSubmit={onSubmit} className="mt-10 mx-auto max-w-xl">
          <div className="relative flex flex-col sm:flex-row items-stretch gap-2 p-2 rounded-2xl glass-strong shadow-2xl shadow-black/40">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-accent" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="satyan@microsoft.com"
                className="w-full bg-transparent pl-10 pr-3 py-3 text-sm text-text-primary placeholder:text-text-accent/60 focus:outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl btn-brand text-sm disabled:opacity-70"
            >
              {pending ? "Searching…" : "Search"}
              {!pending && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-3 text-xs text-text-accent/80">
            Try a sample:{" "}
            <button
              type="button"
              onClick={() => setEmail("satyan@microsoft.com")}
              className="font-mono text-brand-primary hover:underline"
            >
              satyan@microsoft.com
            </button>
          </p>
        </form>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-text-accent">
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-brand-primary" />
            Zero false positives policy
          </span>
          <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-text-accent/40" />
          <span>10+ data sources correlated</span>
          <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-text-accent/40" />
          <span>GDPR &amp; CCPA compliant</span>
        </div>
      </div>
    </section>
  );
}
