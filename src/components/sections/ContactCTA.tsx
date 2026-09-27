"use client";

import { useState } from "react";
import { ArrowRight, Mail, MessageSquare } from "lucide-react";

export default function ContactCTA() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setEmail("");
    }, 3500);
  };

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl glass-strong p-8 sm:p-12">
          <div className="absolute inset-0 hero-glow pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-text-accent">
                <MessageSquare className="h-3.5 w-3.5 text-brand-primary" />
                <span>Talk to us</span>
              </div>
              <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
                Ready to see who&apos;s really behind the email?
              </h2>
              <p className="mt-4 text-text-accent leading-relaxed">
                Start with a single search, or book a demo for your team. We&apos;ll walk you
                through the platform, share sample reports, and help you pick the right plan.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#signup"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg btn-brand text-sm"
                >
                  Sign up free
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg glass text-sm hover:border-brand-primary/40 transition-colors"
                >
                  <Mail className="h-4 w-4 text-brand-primary" />
                  Contact sales
                </a>
              </div>
            </div>

            <div>
              <form onSubmit={onSubmit} className="rounded-2xl glass p-5">
                <p className="text-sm font-semibold">Get a sample report</p>
                <p className="mt-1 text-xs text-text-accent">
                  Drop your work email — we&apos;ll send a sample OSINT report and a calendar link.
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="flex-1 bg-white/5 ring-1 ring-white/10 rounded-lg px-3 py-2.5 text-sm placeholder:text-text-accent/60 focus:outline-none focus:ring-brand-primary/40 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-lg btn-brand text-sm whitespace-nowrap"
                  >
                    {submitted ? "Sent ✓" : "Send report"}
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-text-accent/70">
                  No spam. One email, then you decide.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
