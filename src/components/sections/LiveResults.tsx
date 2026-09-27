"use client";

import { useState, useEffect, useRef } from "react";
import {
  Briefcase,
  GraduationCap,
  MapPin,
  Github,
  Twitter,
  ShieldAlert,
  Award,
  Camera,
  Check,
  X,
  Loader2,
  Download,
  ExternalLink,
  Lock,
} from "lucide-react";
import { generateProfile, type GeneratedProfile } from "@/lib/profile-generator";

const ICON_MAP: Record<string, any> = {
  briefcase: Briefcase,
  education: GraduationCap,
  map: MapPin,
  github: Github,
  twitter: Twitter,
  shield: ShieldAlert,
  award: Award,
};

const MATCH_BADGE: Record<string, { label: string; color: string }> = {
  strong:    { label: "Strong match",    color: "text-brand-primary bg-brand-primary/10 ring-brand-primary/30" },
  moderate:  { label: "Moderate match",  color: "text-yellow-300 bg-yellow-300/10 ring-yellow-300/30" },
  weak:      { label: "Weak signal",     color: "text-text-accent bg-white/5 ring-white/10" },
};

const SCAN_STEPS = [
  "Parsing email header…",
  "Querying LinkedIn public profiles…",
  "Cross-referencing GitHub commits…",
  "Checking Google profile + Maps reviews…",
  "Scanning breach corpus…",
  "Verifying identity signals…",
  "Compiling structured report…",
];

export default function LiveResults({ email }: { email: string }) {
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [profile, setProfile] = useState<GeneratedProfile | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    setDone(false);
    setProfile(null);
    setScanStep(0);

    const run = async () => {
      for (let i = 0; i < SCAN_STEPS.length; i++) {
        if (cancelledRef.current) return;
        setScanStep(i);
        await new Promise((r) => setTimeout(r, 420 + (i === 4 ? 200 : 0)));
      }
      if (cancelledRef.current) return;
      const p = generateProfile(email);
      setProfile(p);
      setLoading(false);
      setDone(true);
    };

    run();

    return () => {
      cancelledRef.current = true;
    };
  }, [email]);

  return (
    <section id="search-results" className="py-16 sm:py-20 relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/[0.04] via-transparent to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="rounded-2xl glass-strong p-5 sm:p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/15 ring-1 ring-brand-primary/30">
                {done ? <Check className="h-4 w-4 text-brand-primary" /> : <Loader2 className="h-4 w-4 text-brand-primary animate-spin" />}
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-accent/80">
                  {done ? "Search complete" : "Scanning"}
                </p>
                <p className="text-sm font-mono">{email}</p>
              </div>
            </div>
            {done && profile && (
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md glass hover:border-brand-primary/40 transition-colors">
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md btn-brand">
                  <Download className="h-3.5 w-3.5" /> PDF report
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl glass p-6 sm:p-8">
            <div className="space-y-2.5">
              {SCAN_STEPS.map((s, i) => {
                const isCurrent = i === scanStep;
                const isPast = i < scanStep;
                return (
                  <div
                    key={s}
                    className={`flex items-center gap-3 transition-opacity ${
                      isCurrent || isPast ? "opacity-100" : "opacity-30"
                    }`}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-mono">
                      {isPast ? (
                        <Check className="h-3.5 w-3.5 text-brand-primary" />
                      ) : isCurrent ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-primary" />
                      ) : (
                        <span className="text-text-accent/60">{String(i + 1).padStart(2, "0")}</span>
                      )}
                    </span>
                    <span className={`text-sm ${isCurrent ? "text-text-primary font-medium" : "text-text-accent"}`}>
                      {s}
                    </span>
                    {isPast && <span className="ml-auto text-[10px] text-brand-primary font-mono">done</span>}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-brand-primary transition-all duration-500"
                style={{ width: `${((scanStep + 1) / SCAN_STEPS.length) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-[11px] text-text-accent/70 font-mono">
              step {scanStep + 1}/{SCAN_STEPS.length} · progress {Math.round(((scanStep + 1) / SCAN_STEPS.length) * 100)}%
            </p>
          </div>
        )}

        {/* Results */}
        {done && profile && (
          <div className="space-y-5 animate-slide-in">
            {/* Identity banner */}
            <div className="rounded-2xl glass-strong p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="relative">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-brand-primary/30 to-brand-primary/5 ring-1 ring-brand-primary/30 flex items-center justify-center text-2xl font-bold text-brand-primary">
                    {profile.initials}
                  </div>
                  {profile.verified && (
                    <span className="absolute -bottom-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[9px] text-[#081016] font-bold ring-2 ring-[#0B1117]">
                      ✓
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-xl sm:text-2xl font-bold">{profile.displayName}</h3>
                    <span className="font-mono text-xs text-text-accent">{profile.email}</span>
                  </div>
                  <p className="mt-1 text-sm text-text-accent">{profile.headline}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-brand-primary/10 ring-1 ring-brand-primary/30 px-2.5 py-0.5 text-brand-primary">
                      {profile.sourcesMatched} sources matched
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 ring-1 ${profile.verified ? "bg-brand-primary/10 text-brand-primary ring-brand-primary/30" : "bg-white/5 text-text-accent ring-white/10"}`}>
                      {profile.verified ? "Verified identity" : "Identity uncertain"}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 ring-1 ${
                      profile.riskScore === "Low" ? "bg-green-400/10 text-green-300 ring-green-300/30" :
                      profile.riskScore === "Moderate" ? "bg-yellow-300/10 text-yellow-300 ring-yellow-300/30" :
                      "bg-red-400/10 text-red-300 ring-red-300/30"
                    }`}>
                      Risk: {profile.riskScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Sources matched" value={String(profile.sourcesMatched)} />
              <StatCard label="Breaches found" value={String(profile.breaches.length)} />
              <StatCard label="Public photos" value={String(profile.photoCount)} />
              <StatCard label="Skills detected" value={String(profile.skills.length)} />
            </div>

            {/* Source cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.cards.map((card, idx) => {
                const Icon = ICON_MAP[card.icon] || Briefcase;
                const badge = MATCH_BADGE[card.matchStrength];
                return (
                  <div
                    key={card.title + idx}
                    className="rounded-xl glass p-4 lift-on-hover animate-slide-in"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{card.title}</p>
                          <p className="text-[10px] text-text-accent/70 font-mono truncate max-w-[140px]">{card.source}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ring-1 ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {card.fields.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 py-0.5">
                          <span className="text-[10px] uppercase tracking-wider text-text-accent/70 w-20 shrink-0 pt-0.5">
                            {f.label}
                          </span>
                          <span className="text-xs text-text-primary flex-1 break-words">{f.value}</span>
                        </div>
                      ))}
                    </div>
                    <a
                      href={`https://${card.source.split("/")[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-[10px] text-brand-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> View source
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Photo strip */}
            <div className="rounded-2xl glass p-5">
              <p className="text-xs font-semibold mb-3">
                Public photos · {profile.photoCount} cross-referenced from Google Maps &amp; LinkedIn
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {Array.from({ length: Math.min(profile.photoCount, 8) }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.02] ring-1 ring-white/10 flex items-center justify-center"
                  >
                    <Camera className="h-4 w-4 text-text-accent/40" />
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl glass p-4 flex items-start gap-3">
              <Lock className="h-4 w-4 text-text-accent/60 shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-accent/80 leading-relaxed">
                <span className="text-text-accent">Demo notice:</span> This profile is generated
                deterministically from the email hash for demonstration purposes only. No real
                lookups were performed against any service. The same email always returns the same
                profile. To wire up real OSINT lookups, integrate the REST API (Pro plan +).
              </p>
            </div>

            {/* Reset */}
            <div className="text-center pt-2">
              <button
                onClick={() => {
                  document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-md glass hover:border-brand-primary/40 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> New search
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl glass p-4 text-center">
      <p className="text-2xl sm:text-3xl font-bold text-brand-gradient">{value}</p>
      <p className="mt-1 text-[10px] text-text-accent uppercase tracking-wider">{label}</p>
    </div>
  );
}
