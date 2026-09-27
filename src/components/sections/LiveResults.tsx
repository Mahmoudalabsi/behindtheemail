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
  Mail,
  Globe,
  Server,
  AlertTriangle,
} from "lucide-react";

// ----------------- Types matching the Worker response -----------------

interface EmailValidation { valid: boolean; localPart: string; domain: string; }
interface MxResult { hasMx: boolean; mxRecords: string[]; provider: string | null; }
interface GravatarResult {
  exists: boolean;
  hash: string;
  photoUrl: string | null;
  profileUrl: string;
  displayName?: string;
  about?: string;
  accounts?: Array<{ shortname: string; url: string; display: string }>;
  urls?: Array<{ value: string; title: string }>;
}
interface GitHubResult {
  found: boolean;
  login: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  bio: string | null;
  name: string | null;
  location: string | null;
  company: string | null;
  publicRepos: number | null;
  followers: number | null;
  createdAt: string | null;
}
interface BreachInfo {
  name: string;
  domain: string;
  breachDate: string;
  dataClasses: string[];
  description: string;
  pwnCount: number;
}
interface HIBPResult {
  checked: boolean;
  count: number;
  breaches: BreachInfo[];
  error?: string;
}
interface ServiceProbe {
  service: string;
  icon: string;
  profileUrl: string;
  matched: boolean;
  username?: string;
  avatarUrl?: string;
  displayName?: string;
  bio?: string;
  extra?: Record<string, string>;
}
interface LookupResult {
  email: string;
  timestamp: string;
  emailHash: string;
  validation: EmailValidation;
  mx: MxResult;
  gravatar: GravatarResult;
  github: GitHubResult;
  hibp: HIBPResult;
  services: ServiceProbe[];
  sourcesMatched: number;
  riskScore: "Low" | "Moderate" | "Elevated" | "High";
  summary: string;
  error?: string;
}

const SERVICE_ICONS: Record<string, any> = {
  github: Github,
  google: Globe,
  microsoft: Briefcase,
  reddit: Twitter,
  tumblr: Globe,
};

const WORKER_URL = "https://behindtheemail-osint.mahmoudalabsi0599.workers.dev";

const SCAN_STEPS = [
  { label: "Validating email format & domain",        icon: Mail },
  { label: "Resolving MX records via Cloudflare DNS", icon: Server },
  { label: "Querying Gravatar for profile + avatar",  icon: Camera },
  { label: "Searching GitHub public emails",          icon: Github },
  { label: "Scanning HaveIBeenPwned breach corpus",   icon: ShieldAlert },
  { label: "Probing Reddit, Tumblr, Google accounts", icon: Globe },
  { label: "Cross-referencing & compiling report",    icon: Check },
];

export default function LiveResults({ email }: { email: string }) {
  const [loading, setLoading] = useState(true);
  const [scanStep, setScanStep] = useState(0);
  const [data, setData] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    setData(null);
    setError(null);
    setScanStep(0);

    const run = async () => {
      // Animate scan steps while the real fetch is in flight
      const stepTimers: ReturnType<typeof setTimeout>[] = [];
      SCAN_STEPS.forEach((_, i) => {
        const t = setTimeout(() => {
          if (!cancelledRef.current) setScanStep(i);
        }, 400 * i + (i === 4 ? 200 : 0));
        stepTimers.push(t);
      });

      try {
        const r = await fetch(`${WORKER_URL}/api/lookup?email=${encodeURIComponent(email)}`);
        const json = (await r.json()) as LookupResult & { error?: string };
        if (!r.ok) throw new Error(json.error || `Lookup failed (${r.status})`);

        // Clear pending step timers and jump to final
        for (const t of stepTimers) clearTimeout(t);
        if (cancelledRef.current) return;
        setScanStep(SCAN_STEPS.length - 1);

        await new Promise((r) => setTimeout(r, 300));
        if (cancelledRef.current) return;
        setData(json);
        setLoading(false);
      } catch (e: any) {
        for (const t of stepTimers) clearTimeout(t);
        if (cancelledRef.current) return;
        setError(e?.message || "Lookup failed");
        setLoading(false);
      }
    };

    run();
    return () => { cancelledRef.current = true; };
  }, [email]);

  // ----------------- Cards derived from real data -----------------

  type Card = {
    title: string;
    source: string;
    icon: any;
    matchStrength: "strong" | "moderate" | "weak" | "none";
    fields: { label: string; value: string }[];
    photoUrl?: string;
  };

  function buildCards(d: LookupResult): Card[] {
    const cards: Card[] = [];

    // MX / Mail provider
    if (d.mx.hasMx) {
      cards.push({
        title: "Mail Provider",
        source: `dns-query / ${d.validation.domain}`,
        icon: Server,
        matchStrength: "strong",
        fields: [
          { label: "Provider", value: d.mx.provider || d.mx.mxRecords[0] || "Unknown" },
          { label: "MX count", value: String(d.mx.mxRecords.length) },
          { label: "Primary MX", value: d.mx.mxRecords[0] || "—" },
          { label: "Domain", value: d.validation.domain },
        ],
      });
    }

    // Gravatar
    if (d.gravatar.exists) {
      cards.push({
        title: "Gravatar Profile",
        source: "gravatar.com",
        icon: Camera,
        matchStrength: "strong",
        photoUrl: d.gravatar.photoUrl || undefined,
        fields: [
          { label: "Display name", value: d.gravatar.displayName || "—" },
          { label: "About", value: d.gravatar.about || "—" },
          { label: "Hash", value: d.gravatar.hash },
          ...(d.gravatar.accounts || []).slice(0, 3).map((a) => ({
            label: a.shortname,
            value: a.display,
          })),
        ],
      });
    }

    // GitHub
    if (d.github.found) {
      cards.push({
        title: "GitHub Activity",
        source: `github.com/${d.github.login}`,
        icon: Github,
        matchStrength: "strong",
        photoUrl: d.github.avatarUrl || undefined,
        fields: [
          { label: "Username", value: d.github.login || "—" },
          { label: "Name", value: d.github.name || "—" },
          { label: "Bio", value: d.github.bio || "—" },
          { label: "Company", value: d.github.company || "—" },
          { label: "Location", value: d.github.location || "—" },
          { label: "Public repos", value: String(d.github.publicRepos ?? "—") },
          { label: "Followers", value: d.github.followers != null ? d.github.followers.toLocaleString() : "—" },
          { label: "Joined", value: d.github.createdAt ? d.github.createdAt.slice(0, 10) : "—" },
        ],
      });
    }

    // Other services (matched ones)
    for (const s of d.services) {
      if (!s.matched) continue;
      cards.push({
        title: s.service,
        source: s.profileUrl,
        icon: SERVICE_ICONS[s.icon] || Globe,
        matchStrength: "moderate",
        photoUrl: s.avatarUrl,
        fields: [
          { label: "Username", value: s.username || "—" },
          { label: "Display name", value: s.displayName || "—" },
          { label: "Bio", value: s.bio || "—" },
          ...(s.extra ? Object.entries(s.extra).map(([k, v]) => ({
            label: k.replace(/_/g, " "),
            value: v,
          })) : []),
        ],
      });
    }

    // Breach exposure
    const hibp = d.hibp;
    cards.push({
      title: "Breach Exposure",
      source: hibp.checked ? "haveibeenpwned.com" : "haveibeenpwned.com (not configured)",
      icon: ShieldAlert,
      matchStrength: hibp.count > 0 ? "moderate" : "weak",
      fields: hibp.checked
        ? hibp.breaches.length > 0
          ? hibp.breaches.slice(0, 5).map((b) => ({
              label: b.name,
              value: `${b.breachDate} · ${b.dataClasses.join(", ").slice(0, 60)}`,
            }))
          : [{ label: "Status", value: "✓ No breaches found" }]
        : [{ label: "Status", value: "API key not configured" }],
    });

    return cards;
  }

  // ----------------- Render -----------------

  return (
    <section id="search-results" className="py-16 sm:py-20 relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/[0.04] via-transparent to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="rounded-2xl glass-strong p-5 sm:p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/15 ring-1 ring-brand-primary/30">
                {error ? <X className="h-4 w-4 text-red-400" /> :
                 loading ? <Loader2 className="h-4 w-4 text-brand-primary animate-spin" /> :
                 <Check className="h-4 w-4 text-brand-primary" />}
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-accent/80">
                  {error ? "Lookup failed" : loading ? "Scanning live sources" : "Search complete (live data)"}
                </p>
                <p className="text-sm font-mono">{email}</p>
              </div>
            </div>
            {data && !error && (
              <div className="flex items-center gap-2">
                <a
                  href={`${WORKER_URL}/api/lookup?email=${encodeURIComponent(email)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md glass hover:border-brand-primary/40 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Raw JSON
                </a>
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
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className={`flex items-center gap-3 transition-opacity ${isCurrent || isPast ? "opacity-100" : "opacity-30"}`}
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
                    <Icon className={`h-3.5 w-3.5 ${isCurrent ? "text-brand-primary" : isPast ? "text-brand-primary/60" : "text-text-accent/40"}`} />
                    <span className={`text-sm ${isCurrent ? "text-text-primary font-medium" : "text-text-accent"}`}>
                      {s.label}
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
              step {scanStep + 1}/{SCAN_STEPS.length} · progress {Math.round(((scanStep + 1) / SCAN_STEPS.length) * 100)}% · live lookup in progress
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-2xl glass p-6 sm:p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-300 mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">Lookup failed</p>
            <p className="text-xs text-text-accent mb-5 max-w-md mx-auto">
              {error}. Please check the email is valid and try again.
            </p>
            <button
              onClick={() => document.getElementById("top")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-md glass hover:border-brand-primary/40 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Try another email
            </button>
          </div>
        )}

        {/* Results */}
        {data && !loading && !error && (
          <div className="space-y-5 animate-slide-in">
            {/* Identity banner */}
            <div className="rounded-2xl glass-strong p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="relative">
                  {data.gravatar.photoUrl || data.github.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.gravatar.photoUrl || data.github.avatarUrl!}
                      alt="Avatar"
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl ring-1 ring-brand-primary/30 object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-brand-primary/30 to-brand-primary/5 ring-1 ring-brand-primary/30 flex items-center justify-center text-2xl font-bold text-brand-primary">
                      {(data.validation.localPart[0] || "?").toUpperCase()}
                    </div>
                  )}
                  {data.sourcesMatched >= 2 && (
                    <span className="absolute -bottom-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[9px] text-[#081016] font-bold ring-2 ring-[#0B1117]">
                      ✓
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-xl sm:text-2xl font-bold break-all">
                      {data.github.name || data.gravatar.displayName || data.github.login || data.validation.localPart}
                    </h3>
                    <span className="font-mono text-xs text-text-accent break-all">{data.email}</span>
                  </div>
                  <p className="mt-1 text-sm text-text-accent">
                    {data.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-brand-primary/10 ring-1 ring-brand-primary/30 px-2.5 py-0.5 text-brand-primary">
                      {data.sourcesMatched} sources matched
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 ring-1 ${
                      data.sourcesMatched >= 2 ? "bg-brand-primary/10 text-brand-primary ring-brand-primary/30" : "bg-white/5 text-text-accent ring-white/10"
                    }`}>
                      {data.sourcesMatched >= 2 ? "Verified identity" : "Partial signals"}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 ring-1 ${
                      data.riskScore === "Low" ? "bg-green-400/10 text-green-300 ring-green-300/30" :
                      data.riskScore === "Moderate" ? "bg-yellow-300/10 text-yellow-300 ring-yellow-300/30" :
                      data.riskScore === "Elevated" ? "bg-orange-400/10 text-orange-300 ring-orange-300/30" :
                      "bg-red-400/10 text-red-300 ring-red-300/30"
                    }`}>
                      Risk: {data.riskScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Sources matched" value={String(data.sourcesMatched)} />
              <StatCard label="Breaches found" value={data.hibp.checked ? String(data.hibp.count) : "—"} />
              <StatCard label="Services probed" value={String(data.services.length)} />
              <StatCard label="Avatar found" value={data.gravatar.exists || data.github.avatarUrl ? "Yes" : "No"} />
            </div>

            {/* Source cards */}
            {buildCards(data).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {buildCards(data).map((card, idx) => {
                  const Icon = card.icon;
                  const badge = MATCH_BADGE[card.matchStrength] || MATCH_BADGE.weak;
                  return (
                    <div
                      key={card.title + idx}
                      className="rounded-xl glass p-4 lift-on-hover animate-slide-in"
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10 overflow-hidden">
                            {card.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={card.photoUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Icon className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
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
                            <span className="text-[10px] uppercase tracking-wider text-text-accent/70 w-20 shrink-0 pt-0.5 break-words">
                              {f.label}
                            </span>
                            <span className="text-xs text-text-primary flex-1 break-words">{f.value}</span>
                          </div>
                        ))}
                      </div>
                      <a
                        href={card.source.startsWith("http") ? card.source : `https://${card.source.split("/")[0]}`}
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
            )}

            {/* Unmatched services summary */}
            <div className="rounded-xl glass p-4">
              <p className="text-xs font-semibold mb-2">Other services probed (no match)</p>
              <div className="flex flex-wrap gap-2">
                {data.services.filter((s) => !s.matched).map((s) => (
                  <a
                    key={s.service}
                    href={s.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-text-accent/60 hover:text-text-accent transition-colors"
                    title={`Probed ${s.service} — no public account found`}
                  >
                    <X className="h-3 w-3" /> {s.service}
                  </a>
                ))}
              </div>
            </div>

            {/* HIBP error notice (if API key missing) */}
            {data.hibp.error && (
              <div className="rounded-xl glass p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-yellow-300 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold mb-0.5">Breach data unavailable</p>
                  <p className="text-[11px] text-text-accent leading-relaxed">
                    {data.hibp.error}. To enable real breach lookups, set the{" "}
                    <code className="font-mono text-brand-primary">HIBP_API_TOKEN</code> secret on the Worker
                    via <code className="font-mono text-brand-primary">wrangler secret put HIBP_API_TOKEN</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Privacy notice */}
            <div className="rounded-xl glass p-4 flex items-start gap-3">
              <Lock className="h-4 w-4 text-text-accent/60 shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-accent/80 leading-relaxed">
                <span className="text-text-accent">Live lookup:</span> This scan was performed in real time
                against public APIs (Gravatar, GitHub, HaveIBeenPwned, Cloudflare DNS, Reddit, Tumblr). No
                data is stored. The Worker is open-source in this repo at <code className="font-mono">worker/src/index.ts</code>.
              </p>
            </div>

            {/* Reset */}
            <div className="text-center pt-2">
              <button
                onClick={() => document.getElementById("top")?.scrollIntoView({ behavior: "smooth" })}
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

const MATCH_BADGE: Record<string, { label: string; color: string }> = {
  strong:    { label: "Strong match",    color: "text-brand-primary bg-brand-primary/10 ring-brand-primary/30" },
  moderate:  { label: "Moderate match",  color: "text-yellow-300 bg-yellow-300/10 ring-yellow-300/30" },
  weak:      { label: "Weak signal",     color: "text-text-accent bg-white/5 ring-white/10" },
  none:      { label: "No match",        color: "text-text-accent/50 bg-white/5 ring-white/10" },
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl glass p-4 text-center">
      <p className="text-2xl sm:text-3xl font-bold text-brand-gradient">{value}</p>
      <p className="mt-1 text-[10px] text-text-accent uppercase tracking-wider">{label}</p>
    </div>
  );
}
