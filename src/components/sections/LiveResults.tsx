"use client";

import { useState, useEffect, useRef } from "react";
import {
  Briefcase, GraduationCap, MapPin, Github, Twitter, ShieldAlert,
  Camera, Check, X, Loader2, Download, ExternalLink, Lock, Mail,
  Globe, Server, AlertTriangle, Code, MessageSquare, Image as ImageIcon,
  Gamepad2, Send, User, Music, Video, Calendar, Award, Users, FileText,
  Building2, Star, Link2,
} from "lucide-react";

// ----------------- Types -----------------

type ServiceCategory = "developer" | "social" | "creative" | "gaming" | "forum" | "blog" | "professional" | "messaging" | "video";

interface EmailValidation {
  valid: boolean; localPart: string; domain: string;
  isServiceEmail: boolean; serviceType: string | null;
}
interface MxResult { hasMx: boolean; mxRecords: string[]; provider: string | null; }
interface GravatarResult {
  exists: boolean; hash: string; photoUrl: string | null; profileUrl: string;
  displayName?: string; about?: string;
  accounts?: Array<{ shortname: string; url: string; display: string }>;
  urls?: Array<{ value: string; title: string }>;
}
interface GitHubResult {
  found: boolean; login: string | null; profileUrl: string | null; avatarUrl: string | null;
  bio: string | null; name: string | null; location: string | null; company: string | null;
  blog: string | null; twitterUsername: string | null;
  publicRepos: number | null; publicGists: number | null;
  followers: number | null; following: number | null;
  createdAt: string | null; updatedAt: string | null;
}
interface BreachInfo {
  name: string; domain: string; breachDate: string;
  dataClasses: string[]; description: string; pwnCount: number;
}
interface HIBPResult {
  checked: boolean; count: number; breaches: BreachInfo[]; error?: string;
}
interface ServiceProbe {
  service: string; category: ServiceCategory; icon: string; profileUrl: string;
  matched: boolean; matchType: "email" | "username-guess";
  verifiedVia?: "firefox-api" | "hibp-breach" | "gravatar-link" | "github-email" | "dns-txt" | "password-reset" | "signup-api" | "username-guess";
  confidence: "high" | "medium" | "low";
  username?: string; avatarUrl?: string; bannerUrl?: string;
  displayName?: string; bio?: string; location?: string; joinedAt?: string;
  followerCount?: number; followingCount?: number; postCount?: number;
  verified?: boolean; extra?: Record<string, string>;
}
interface IdentityPhoto { service: string; url: string; category: ServiceCategory; }
interface TimelineEvent {
  date: string; service: string; category: ServiceCategory;
  profileUrl: string; avatarUrl?: string;
}
interface LookupResult {
  email: string; timestamp: string; emailHash: string;
  validation: EmailValidation; mx: MxResult; gravatar: GravatarResult;
  github: GitHubResult; hibp: HIBPResult;
  services: ServiceProbe[]; confirmedAccounts: ServiceProbe[]; guessAccounts: ServiceProbe[];
  identityPhotos: IdentityPhoto[]; timeline: TimelineEvent[];
  sourcesMatched: number; matchedAccounts: number;
  confirmedCount: number; guessCount: number; totalServices: number;
  riskScore: "Low" | "Moderate" | "Elevated" | "High";
  summary: string; probesByCategory: Record<string, number>;
  error?: string;
}

const SERVICE_ICONS: Record<string, any> = {
  github: Github, gitlab: Code, bitbucket: Code, google: Globe, microsoft: Briefcase,
  reddit: MessageSquare, tumblr: ImageIcon, code: Code, news: FileText, image: ImageIcon,
  user: User, shield: ShieldAlert, send: Send, gamepad: Gamepad2, video: Video,
  message: MessageSquare, music: Music, twitter: Twitter, briefcase: Briefcase,
};

const WORKER_URL = "https://behindtheemail-osint.mahmoudalabsi0599.workers.dev";

const SCAN_STEPS = [
  { label: "Validating email format & domain", icon: Mail },
  { label: "Resolving MX records via Cloudflare DNS", icon: Server },
  { label: "Querying Gravatar profile + avatar", icon: Camera },
  { label: "Searching GitHub public emails", icon: Github },
  { label: "Scanning HaveIBeenPwned breach corpus", icon: ShieldAlert },
  { label: "Probing 25+ services for account matches", icon: Globe },
  { label: "Aggregating avatars & building timeline", icon: Award },
  { label: "Cross-referencing & compiling report", icon: Check },
];

export default function LiveResults({ email }: { email: string }) {
  const [loading, setLoading] = useState(true);
  const [scanStep, setScanStep] = useState(0);
  const [data, setData] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true); setData(null); setError(null); setScanStep(0);
    const run = async () => {
      const stepTimers: ReturnType<typeof setTimeout>[] = [];
      SCAN_STEPS.forEach((_, i) => {
        const t = setTimeout(() => { if (!cancelledRef.current) setScanStep(i); }, 300 * i + (i === 4 ? 200 : 0));
        stepTimers.push(t);
      });
      try {
        const r = await fetch(`${WORKER_URL}/api/lookup?email=${encodeURIComponent(email)}`);
        const json = (await r.json()) as LookupResult & { error?: string };
        if (!r.ok) throw new Error(json.error || `Lookup failed (${r.status})`);
        for (const t of stepTimers) clearTimeout(t);
        if (cancelledRef.current) return;
        setScanStep(SCAN_STEPS.length - 1);
        await new Promise((r) => setTimeout(r, 300));
        if (cancelledRef.current) return;
        setData(json); setLoading(false);
      } catch (e: any) {
        for (const t of stepTimers) clearTimeout(t);
        if (cancelledRef.current) return;
        setError(e?.message || "Lookup failed"); setLoading(false);
      }
    };
    run();
    return () => { cancelledRef.current = true; };
  }, [email]);

  // -------------------- Render --------------------

  return (
    <section id="search-results" className="py-12 sm:py-16 relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/[0.04] via-transparent to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        {/* Report header */}
        <div className="rounded-2xl glass-strong p-5 sm:p-6 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/15 ring-1 ring-brand-primary/30">
                {error ? <X className="h-4 w-4 text-red-400" /> :
                 loading ? <Loader2 className="h-4 w-4 text-brand-primary animate-spin" /> :
                 <Check className="h-4 w-4 text-brand-primary" />}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-text-accent/80">
                  {error ? "Lookup failed" : loading ? "Scanning live sources" : "OSINT Report · Live data"}
                </p>
                <p className="text-sm font-mono break-all">{email}</p>
              </div>
            </div>
            {data && !error && (
              <div className="flex items-center gap-2">
                <a href={`${WORKER_URL}/api/lookup?email=${encodeURIComponent(email)}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md glass hover:border-brand-primary/40 transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" /> Raw JSON
                </a>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md btn-brand">
                  <Download className="h-3.5 w-3.5" /> Export
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
                const isCurrent = i === scanStep; const isPast = i < scanStep;
                const Icon = s.icon;
                return (
                  <div key={s.label} className={`flex items-center gap-3 transition-opacity ${isCurrent || isPast ? "opacity-100" : "opacity-30"}`}>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-mono">
                      {isPast ? <Check className="h-3.5 w-3.5 text-brand-primary" /> :
                       isCurrent ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-primary" /> :
                       <span className="text-text-accent/60">{String(i + 1).padStart(2, "0")}</span>}
                    </span>
                    <Icon className={`h-3.5 w-3.5 ${isCurrent ? "text-brand-primary" : isPast ? "text-brand-primary/60" : "text-text-accent/40"}`} />
                    <span className={`text-sm ${isCurrent ? "text-text-primary font-medium" : "text-text-accent"}`}>{s.label}</span>
                    {isPast && <span className="ml-auto text-[10px] text-brand-primary font-mono">done</span>}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-brand-primary transition-all duration-500"
                style={{ width: `${((scanStep + 1) / SCAN_STEPS.length) * 100}%` }} />
            </div>
            <p className="mt-3 text-[11px] text-text-accent/70 font-mono">
              step {scanStep + 1}/{SCAN_STEPS.length} · progress {Math.round(((scanStep + 1) / SCAN_STEPS.length) * 100)}%
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-2xl glass p-6 sm:p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-300 mx-auto mb-3" />
            <p className="text-sm font-semibold mb-1">Lookup failed</p>
            <p className="text-xs text-text-accent mb-5 max-w-md mx-auto">{error}</p>
            <button onClick={() => document.getElementById("top")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-md glass hover:border-brand-primary/40 transition-colors">
              <X className="h-3.5 w-3.5" /> Try another email
            </button>
          </div>
        )}

        {/* REPORT - matches original site's vertical source-card layout */}
        {data && !loading && !error && (
          <div className="space-y-4 animate-slide-in">

            {/* Identity banner */}
            <IdentityBanner data={data} />

            {/* Top stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Confirmed" value={String(data.confirmedCount || 0)} accent="green" icon={Check} />
              <StatCard label="Guesses" value={String(data.guessCount || 0)} accent="yellow" icon={Users} />
              <StatCard label="Avatars" value={String(data.identityPhotos.length)} icon={Camera} />
              <StatCard label="Breaches" value={data.hibp.checked ? String(data.hibp.count) : "—"} accent={data.hibp.count > 0 ? "red" : "default"} icon={ShieldAlert} />
            </div>

            {/* Source cards — vertical list like the original */}
            <SourceCards data={data} />

            {/* Photo Wall */}
            {data.identityPhotos.length > 0 && (
              <PhotoWall photos={data.identityPhotos} />
            )}

            {/* Timeline */}
            {data.timeline.length > 0 && (
              <Timeline timeline={data.timeline} />
            )}

            {/* Registered Accounts (compact list at bottom — matches original) */}
            <RegisteredAccounts services={data.services} />

            {/* Services probed matrix */}
            <ServicesMatrix services={data.services} probesByCategory={data.probesByCategory} />

            {/* HIBP notice */}
            {data.hibp.error && (
              <div className="rounded-xl glass p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-yellow-300 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold mb-0.5">Breach data unavailable</p>
                  <p className="text-[11px] text-text-accent leading-relaxed">
                    {data.hibp.error}. Set{" "}
                    <code className="font-mono text-brand-primary">HIBP_API_TOKEN</code> via{" "}
                    <code className="font-mono text-brand-primary">wrangler secret put HIBP_API_TOKEN</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Privacy footer */}
            <div className="rounded-xl glass p-4 flex items-start gap-3">
              <Lock className="h-4 w-4 text-text-accent/60 shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-accent/80 leading-relaxed">
                <span className="text-text-accent">Live lookup:</span> Scanned in real time against
                Cloudflare DNS, Gravatar, GitHub, HaveIBeenPwned, Firefox Accounts API, Twitter,
                Spotify, Duolingo, Pinterest, Tumblr, Reddit, GitLab, Bitbucket, HackerNews, Keybase,
                Steam, Roblox, Twitch, TikTok, YouTube, SoundCloud, Imgur. No data stored.
                Open-source at <code className="font-mono text-brand-primary">worker/src/index.ts</code>.
              </p>
            </div>

            {/* Reset */}
            <div className="text-center pt-2">
              <button onClick={() => document.getElementById("top")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-md glass hover:border-brand-primary/40 transition-colors">
                <X className="h-3.5 w-3.5" /> New search
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// -------------------- SourceCards (main report content) --------------------
// Matches the original site's pattern: vertical list of rich source cards.
// Each card shows: service name + name + title/bio + structured data fields.

function SourceCards({ data }: { data: LookupResult }) {
  // Collect all matched services (confirmed first, then guesses) and build rich cards for each
  const matched = data.services.filter(s => s.matched);
  const cards: JSX.Element[] = [];

  // 1. Mail Provider card (always shown if MX exists)
  if (data.mx.hasMx) {
    cards.push(
      <SourceCard
        key="mail-provider"
        serviceName="Mail Provider"
        icon={Server}
        confidence="high"
        verifiedVia="dns-txt"
        avatarUrl={undefined}
        displayName={data.mx.provider || "Unknown"}
        subtitle={`DNS · ${data.validation.domain}`}
        profileUrl={`https://1.1.1.1/?name=${data.validation.domain}#dns`}
        fields={[
          { label: "Provider", value: data.mx.provider || data.mx.mxRecords[0] || "Unknown" },
          { label: "MX Records", value: String(data.mx.mxRecords.length) },
          { label: "Primary MX", value: data.mx.mxRecords[0] || "—" },
          { label: "Domain", value: data.validation.domain },
          ...(data.validation.isServiceEmail ? [{ label: "Email Type", value: `Service email (${data.validation.serviceType}@)` }] : []),
        ]}
      />
    );
  }

  // 2. GitHub card (rich if found)
  if (data.github.found) {
    const g = data.github;
    cards.push(
      <SourceCard
        key="github"
        serviceName="GitHub"
        icon={Github}
        confidence="high"
        verifiedVia="github-email"
        avatarUrl={g.avatarUrl || undefined}
        displayName={g.name || g.login || "GitHub User"}
        subtitle={g.bio || (g.company ? `${g.company}` : "Developer")}
        profileUrl={g.profileUrl || "https://github.com"}
        sections={[
          {
            title: "Profile",
            icon: User,
            fields: [
              { label: "Username", value: `@${g.login}` },
              ...(g.name ? [{ label: "Name", value: g.name }] : []),
              ...(g.bio ? [{ label: "Bio", value: g.bio }] : []),
              ...(g.company ? [{ label: "Company", value: g.company }] : []),
              ...(g.location ? [{ label: "Location", value: g.location }] : []),
              ...(g.blog ? [{ label: "Blog", value: g.blog }] : []),
              ...(g.twitterUsername ? [{ label: "Twitter", value: `@${g.twitterUsername}` }] : []),
              ...(g.createdAt ? [{ label: "Joined", value: g.createdAt.slice(0, 10) }] : []),
            ]
          },
          {
            title: "Statistics",
            icon: Award,
            fields: [
              ...(g.followers != null ? [{ label: "Followers", value: g.followers.toLocaleString() }] : []),
              ...(g.following != null ? [{ label: "Following", value: g.following.toLocaleString() }] : []),
              ...(g.publicRepos != null ? [{ label: "Public Repos", value: String(g.publicRepos) }] : []),
              ...(g.publicGists != null ? [{ label: "Public Gists", value: String(g.publicGists) }] : []),
            ]
          }
        ]}
      />
    );
  }

  // 3. Gravatar card (if exists)
  if (data.gravatar.exists) {
    const gv = data.gravatar;
    cards.push(
      <SourceCard
        key="gravatar"
        serviceName="Gravatar"
        icon={Camera}
        confidence="high"
        verifiedVia="github-email"
        avatarUrl={gv.photoUrl || undefined}
        displayName={gv.displayName || "Gravatar User"}
        subtitle={gv.about || "Globally recognized avatar"}
        profileUrl={gv.profileUrl}
        sections={[
          {
            title: "Profile",
            icon: User,
            fields: [
              ...(gv.displayName ? [{ label: "Display Name", value: gv.displayName }] : []),
              ...(gv.about ? [{ label: "About", value: gv.about }] : []),
              { label: "Hash", value: gv.hash },
              ...(gv.accounts?.length ? [{ label: "Linked Accounts", value: String(gv.accounts.length) }] : []),
            ]
          }
        ]}
      />
    );
  }

  // 4. Data Breach Exposure card (always shown when hibp.checked)
  {
    const hibp = data.hibp;
    if (hibp.checked) {
      cards.push(
        <SourceCard
          key="breaches"
          serviceName="Data Breach Exposure"
          icon={ShieldAlert}
          confidence="high"
          verifiedVia="hibp-breach"
          avatarUrl={undefined}
          displayName={hibp.count === 0 ? "No breaches found" : `Found in ${hibp.count} breach${hibp.count === 1 ? "" : "es"}`}
          subtitle={hibp.breaches.length > 0
            ? `${hibp.breaches[0].breachDate} → ${hibp.breaches[hibp.breaches.length - 1].breachDate}`
            : "Email is clean"}
          profileUrl="https://haveibeenpwned.com"
          accent={hibp.count > 0 ? "red" : "green"}
          sections={hibp.breaches.length > 0 ? [
            {
              title: "Breach Sources",
              icon: ShieldAlert,
              fields: hibp.breaches.slice(0, 6).map(b => ({
                label: b.name,
                value: `${b.breachDate} · ${b.dataClasses.slice(0, 3).join(", ")}`,
              })),
            }
          ] : undefined}
        />
      );
    } else if (hibp.error) {
      cards.push(
        <SourceCard
          key="breaches-unavail"
          serviceName="Data Breach Exposure"
          icon={ShieldAlert}
          confidence="low"
          verifiedVia="username-guess"
          avatarUrl={undefined}
          displayName="Breach scan unavailable"
          subtitle="Set HIBP_API_TOKEN to enable"
          profileUrl="https://haveibeenpwned.com"
          accent="yellow"
        />
      );
    }
  }

  // 5. Other matched services — each as a card
  for (const s of matched) {
    if (s.service === "GitHub" || s.service === "Gravatar") continue; // already shown
    if (s.service === "Mail Provider") continue;
    if (s.service === "Data Breach Exposure") continue;

    const Icon = SERVICE_ICONS[s.icon] || Globe;
    const isConfirmed = s.matchType === "email" && s.verifiedVia !== "username-guess";

    cards.push(
      <SourceCard
        key={s.service}
        serviceName={s.service}
        icon={Icon}
        confidence={isConfirmed ? "high" : "low"}
        verifiedVia={s.verifiedVia}
        avatarUrl={s.avatarUrl}
        displayName={s.displayName || s.username || s.service}
        subtitle={s.bio || (isConfirmed ? "Confirmed via real email check" : "Username-guess match — verify manually")}
        profileUrl={s.profileUrl}
        accent={isConfirmed ? "green" : "yellow"}
        sections={[
          {
            title: "Profile",
            icon: User,
            fields: [
              ...(s.username ? [{ label: "Username", value: s.username === data.email ? "email match" : `@${s.username}` }] : []),
              ...(s.displayName ? [{ label: "Display Name", value: s.displayName }] : []),
              ...(s.bio ? [{ label: "Bio", value: s.bio }] : []),
              ...(s.location ? [{ label: "Location", value: s.location }] : []),
              ...(s.joinedAt ? [{ label: "Joined", value: s.joinedAt }] : []),
              ...(s.followerCount != null ? [{ label: "Followers", value: s.followerCount.toLocaleString() }] : []),
              ...(s.followingCount != null ? [{ label: "Following", value: s.followingCount.toLocaleString() }] : []),
              ...(s.postCount != null ? [{ label: "Posts", value: s.postCount.toLocaleString() }] : []),
              ...(s.extra ? Object.entries(s.extra).map(([k, v]) => ({
                label: k.replace(/_/g, " "), value: v,
              })) : []),
              { label: "Match Type", value: isConfirmed ? "Email-based (definitive)" : "Username-guess (heuristic)" },
            ]
          }
        ]}
      />
    );
  }

  return <div className="space-y-4">{cards}</div>;
}

// -------------------- SourceCard (one rich card per service) --------------------

interface CardField { label: string; value: string; }
interface CardSection { title: string; icon: any; fields: CardField[]; }

function SourceCard({
  serviceName, icon: Icon, confidence, verifiedVia, avatarUrl, displayName,
  subtitle, profileUrl, sections, fields, accent,
}: {
  serviceName: string;
  icon: any;
  confidence: "high" | "medium" | "low";
  verifiedVia?: string;
  avatarUrl?: string;
  displayName: string;
  subtitle?: string;
  profileUrl: string;
  sections?: CardSection[];
  fields?: CardField[];
  accent?: "green" | "yellow" | "red" | "default";
}) {
  const accentRing = accent === "green" ? "ring-green-400/30 bg-green-400/[0.04]" :
                      accent === "yellow" ? "ring-yellow-300/20 bg-yellow-300/[0.04]" :
                      accent === "red" ? "ring-red-400/30 bg-red-400/[0.04]" :
                      "ring-white/10";

  return (
    <div className={`rounded-2xl glass p-5 sm:p-6 ring-1 ${accentRing} animate-slide-in lift-on-hover`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Service icon / avatar */}
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 overflow-hidden shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon className="h-6 w-6 text-brand-primary" />
            )}
          </div>
          {/* Service + name */}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-text-accent/70">{serviceName}</p>
            <p className="text-base font-semibold truncate">{displayName}</p>
            {subtitle && <p className="text-xs text-text-accent truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {/* Verification badge */}
        {verifiedVia && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            {confidence === "high" ? (
              <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full ring-1 bg-green-400/15 text-green-300 ring-green-400/30">
                <Check className="h-2.5 w-2.5" /> Confirmed
              </span>
            ) : confidence === "medium" ? (
              <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full ring-1 bg-yellow-300/15 text-yellow-300 ring-yellow-300/30">
                ~ Likely
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full ring-1 bg-white/5 text-text-accent ring-white/10">
                ? Unverified
              </span>
            )}
            <span className="text-[9px] text-text-accent/70 font-mono">{verifiedVia}</span>
          </div>
        )}
      </div>

      {/* Top-level fields (when no sections) */}
      {fields && fields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
          {fields.map((f, i) => (
            <div key={i} className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-text-accent/60">{f.label}</p>
              <p className="text-sm text-text-primary break-words">{f.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sections (rich structured data) */}
      {sections && sections.map((section, i) => (
        <div key={i} className={i > 0 ? "mt-4 pt-4 border-t border-white/5" : ""}>
          <div className="flex items-center gap-2 mb-3">
            <section.icon className="h-3.5 w-3.5 text-brand-primary/70" />
            <p className="text-xs font-semibold uppercase tracking-wider text-text-accent">{section.title}</p>
            <span className="ml-auto text-[10px] text-text-accent/60">{section.fields.length} items</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {section.fields.map((f, j) => (
              <div key={j} className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-text-accent/60">{f.label}</p>
                <p className="text-sm text-text-primary break-words">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Footer: View source button */}
      <a href={profileUrl} target="_blank" rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-brand-primary hover:underline">
        <ExternalLink className="h-3.5 w-3.5" /> View source
      </a>
    </div>
  );
}

// -------------------- Identity banner --------------------

function IdentityBanner({ data }: { data: LookupResult }) {
  const primaryPhoto = data.identityPhotos[0]?.url || data.gravatar.photoUrl || data.github.avatarUrl;
  const displayName = data.github.name || data.gravatar.displayName || data.github.login || data.validation.localPart;
  const followerCount = data.github.followers ?? undefined;

  return (
    <div className="relative rounded-2xl glass-strong p-5 sm:p-7 overflow-hidden">
      <div className="absolute inset-0 hero-glow opacity-30 pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="relative shrink-0">
          {primaryPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primaryPhoto} alt="Avatar" className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl ring-2 ring-brand-primary/40 object-cover shadow-xl shadow-brand-primary/20" />
          ) : (
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-brand-primary/30 to-brand-primary/5 ring-2 ring-brand-primary/40 flex items-center justify-center text-3xl font-bold text-brand-primary">
              {(data.validation.localPart[0] || "?").toUpperCase()}
            </div>
          )}
          {data.sourcesMatched >= 2 && (
            <span className="absolute -bottom-1.5 -right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-[10px] text-[#081016] font-bold ring-2 ring-[#0B1117]">✓</span>
          )}
          {data.identityPhotos.length > 1 && (
            <span className="absolute -top-1.5 -right-1.5 inline-flex h-6 px-1.5 items-center justify-center rounded-full bg-[#192229] ring-1 ring-white/15 text-[10px] font-mono text-brand-primary">+{data.identityPhotos.length - 1}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-2xl sm:text-3xl font-bold break-all">{displayName}</h3>
            <span className="font-mono text-xs text-text-accent break-all">{data.email}</span>
          </div>
          {data.github.bio && <p className="mt-1 text-sm text-text-accent italic">{data.github.bio}</p>}
          <p className="mt-2 text-sm text-text-accent">{data.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-brand-primary/10 ring-1 ring-brand-primary/30 px-2.5 py-0.5 text-brand-primary">{data.sourcesMatched} sources matched</span>
            <span className={`rounded-full px-2.5 py-0.5 ring-1 ${data.sourcesMatched >= 2 ? "bg-brand-primary/10 text-brand-primary ring-brand-primary/30" : "bg-white/5 text-text-accent ring-white/10"}`}>
              {data.sourcesMatched >= 2 ? "Verified identity" : "Partial signals"}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 ring-1 ${
              data.riskScore === "Low" ? "bg-green-400/10 text-green-300 ring-green-300/30" :
              data.riskScore === "Moderate" ? "bg-yellow-300/10 text-yellow-300 ring-yellow-300/30" :
              data.riskScore === "Elevated" ? "bg-orange-400/10 text-orange-300 ring-orange-300/30" :
              "bg-red-400/10 text-red-300 ring-red-300/30"
            }`}>Risk: {data.riskScore}</span>
            {followerCount != null && followerCount > 0 && (
              <span className="rounded-full bg-blue-400/10 ring-1 ring-blue-400/30 px-2.5 py-0.5 text-blue-300">
                <Users className="inline h-3 w-3 mr-1" /> {followerCount.toLocaleString()} followers
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------- PhotoWall --------------------

function PhotoWall({ photos }: { photos: IdentityPhoto[] }) {
  return (
    <div className="rounded-2xl glass p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="h-4 w-4 text-brand-primary" />
        <h3 className="text-sm font-semibold">Identity Photos</h3>
        <span className="text-[11px] text-text-accent">· {photos.length} avatars aggregated from matched services</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
        {photos.map((p, i) => (
          <a key={p.service + i} href={p.url} target="_blank" rel="noopener noreferrer"
            className="group relative aspect-square rounded-xl overflow-hidden ring-1 ring-white/10 hover:ring-brand-primary/40 transition-all"
            title={`${p.service} avatar — click to view full size`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`${p.service} avatar`} className="h-full w-full object-cover" loading="lazy"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent && !parent.querySelector(".fallback")) {
                  const div = document.createElement("div");
                  div.className = "fallback absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02] text-text-accent/40 font-semibold";
                  div.textContent = p.service[0];
                  parent.appendChild(div);
                }
              }} />
            <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 text-[9px] font-medium text-white truncate">{p.service}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// -------------------- Timeline --------------------

function Timeline({ timeline }: { timeline: TimelineEvent[] }) {
  return (
    <div className="rounded-2xl glass p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-brand-primary" />
        <h3 className="text-sm font-semibold">Digital Footprint Timeline</h3>
        <span className="text-[11px] text-text-accent">· {timeline.length} dated events</span>
      </div>
      <div className="relative pl-4">
        <div className="absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-brand-primary/40 via-white/10 to-transparent" />
        <div className="space-y-3">
          {timeline.map((ev, i) => (
            <div key={i} className="relative flex items-start gap-3 animate-slide-in" style={{ animationDelay: `${i * 50}ms` }}>
              <span className="absolute -left-4 top-2 inline-flex h-2 w-2 rounded-full ring-2 ring-[#0B1117] bg-brand-primary" />
              <div className="flex-1 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <a href={ev.profileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-text-primary hover:text-brand-primary transition-colors truncate">{ev.service}</a>
                  <p className="text-[10px] text-text-accent/70 font-mono">{ev.date}</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full ring-1 bg-white/5 ring-white/10 text-text-accent">{ev.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------- Registered Accounts (compact bottom list — matches original) --------------------

function RegisteredAccounts({ services }: { services: ServiceProbe[] }) {
  const matched = services.filter(s => s.matched);
  if (matched.length === 0) return null;

  return (
    <div className="rounded-2xl glass p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-brand-primary" />
          <h3 className="text-sm font-semibold">Registered Accounts</h3>
        </div>
        <span className="text-[11px] text-text-accent">{matched.length} accounts found</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {matched.map((s, i) => {
          const Icon = SERVICE_ICONS[s.icon] || Globe;
          const isConfirmed = s.matchType === "email" && s.verifiedVia !== "username-guess";
          return (
            <a key={s.service + i} href={s.profileUrl} target="_blank" rel="noopener noreferrer"
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg ring-1 transition-all ${
                isConfirmed ? "bg-green-400/[0.06] ring-green-400/20 hover:bg-green-400/[0.10]"
                            : "bg-white/[0.02] ring-white/5 hover:ring-white/10"
              }`}>
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10 overflow-hidden shrink-0">
                {s.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Icon className={`h-4 w-4 ${isConfirmed ? "text-green-300" : "text-text-accent/70"}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{s.service}</p>
                {s.username && (
                  <p className="text-[10px] font-mono text-text-accent truncate">
                    {s.username === services[0]?.email ? "email match" : `@${s.username}`}
                  </p>
                )}
              </div>
              {isConfirmed ? <Check className="h-3.5 w-3.5 text-green-300 shrink-0" />
                           : <span className="text-[9px] text-yellow-300 shrink-0">~</span>}
            </a>
          );
        })}
      </div>
    </div>
  );
}

// -------------------- ServicesMatrix (all probed services — keep but compact) --------------------

function ServicesMatrix({ services, probesByCategory }: { services: ServiceProbe[]; probesByCategory: Record<string, number> }) {
  const byCategory: Record<string, ServiceProbe[]> = {};
  for (const s of services) {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  }
  const matchedCount = services.filter((s) => s.matched).length;

  return (
    <div className="rounded-2xl glass p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">All services probed</h3>
          <p className="text-[11px] text-text-accent mt-0.5">Each service checked for an account matching this email or its local-part</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-brand-gradient">{matchedCount}/{services.length}</p>
          <p className="text-[10px] text-text-accent uppercase tracking-wider">matched</p>
        </div>
      </div>
      <div className="space-y-3">
        {Object.entries(byCategory).map(([cat, items]) => {
          const matchedInCat = items.filter((i) => i.matched).length;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wider text-text-accent/70">{cat}</p>
                <span className="text-[10px] text-text-accent/70">{matchedInCat}/{items.length}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {items.map((s) => {
                  const Icon = SERVICE_ICONS[s.icon] || Globe;
                  const isConfirmed = s.matched && s.matchType === "email" && s.verifiedVia !== "username-guess";
                  const tileClass = !s.matched
                    ? "bg-white/[0.02] ring-white/5"
                    : isConfirmed
                    ? "bg-green-400/[0.08] ring-green-400/30"
                    : "bg-yellow-300/[0.06] ring-yellow-300/20";
                  const iconColor = !s.matched ? "text-text-accent/50"
                                   : isConfirmed ? "text-green-300" : "text-yellow-300";
                  return (
                    <a key={s.service} href={s.profileUrl} target="_blank" rel="noopener noreferrer"
                      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md ring-1 transition-all ${tileClass}`}
                      title={s.matched ? (isConfirmed ? `Confirmed via ${s.verifiedVia}` : "Username guess") : "No account found"}>
                      <Icon className={`h-3 w-3 shrink-0 ${iconColor}`} />
                      <p className={`text-[11px] font-medium truncate ${s.matched ? "text-text-primary" : "text-text-accent/70"}`}>{s.service}</p>
                      {s.matched ? (isConfirmed ? <Check className="h-3 w-3 text-green-300 shrink-0 ml-auto" />
                                                 : <span className="text-yellow-300 shrink-0 ml-auto text-[10px]">~</span>)
                                 : <X className="h-3 w-3 text-text-accent/40 shrink-0 ml-auto" />}
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------- StatCard --------------------

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent?: "green" | "yellow" | "red" | "default" }) {
  const accentClass = accent === "green" ? "from-green-400/30 to-green-400/5"
                    : accent === "yellow" ? "from-yellow-300/30 to-yellow-300/5"
                    : accent === "red" ? "from-red-400/30 to-red-400/5"
                    : "";
  return (
    <div className="rounded-xl glass p-4 text-center relative overflow-hidden">
      {accent && <div className={`absolute inset-0 bg-gradient-to-br ${accentClass} opacity-30 pointer-events-none`} />}
      <Icon className="absolute top-2 right-2 h-3 w-3 text-brand-primary/30" />
      <p className="relative text-2xl sm:text-3xl font-bold text-brand-gradient">{value}</p>
      <p className="relative mt-1 text-[10px] text-text-accent uppercase tracking-wider">{label}</p>
    </div>
  );
}
