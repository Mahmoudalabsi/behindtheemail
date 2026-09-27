"use client";

import { useState, useEffect, useRef } from "react";
import {
  Briefcase,
  MapPin,
  Github,
  Twitter,
  ShieldAlert,
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
  Code,
  MessageSquare,
  Image as ImageIcon,
  Gamepad2,
  Send,
  User,
  Music,
  Video,
  Calendar,
  TrendingUp,
  Award,
  Users,
  FileText,
} from "lucide-react";

// ----------------- Types -----------------

type ServiceCategory = "developer" | "social" | "creative" | "gaming" | "forum" | "blog" | "professional" | "messaging" | "video";

interface EmailValidation {
  valid: boolean;
  localPart: string;
  domain: string;
  isServiceEmail: boolean;
  serviceType: string | null;
}
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
  blog: string | null;
  twitterUsername: string | null;
  publicRepos: number | null;
  publicGists: number | null;
  followers: number | null;
  following: number | null;
  createdAt: string | null;
  updatedAt: string | null;
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
  category: ServiceCategory;
  icon: string;
  profileUrl: string;
  matched: boolean;
  matchType: "email" | "username-guess";
  confidence: "high" | "medium" | "low";
  username?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  displayName?: string;
  bio?: string;
  location?: string;
  joinedAt?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  verified?: boolean;
  extra?: Record<string, string>;
}
interface IdentityPhoto {
  service: string;
  url: string;
  category: ServiceCategory;
}
interface TimelineEvent {
  date: string;
  service: string;
  category: ServiceCategory;
  profileUrl: string;
  avatarUrl?: string;
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
  identityPhotos: IdentityPhoto[];
  timeline: TimelineEvent[];
  sourcesMatched: number;
  matchedAccounts: number;
  totalServices: number;
  riskScore: "Low" | "Moderate" | "Elevated" | "High";
  summary: string;
  probesByCategory: Record<string, number>;
  error?: string;
}

const SERVICE_ICONS: Record<string, any> = {
  github: Github,
  gitlab: Code,
  bitbucket: Code,
  google: Globe,
  microsoft: Briefcase,
  reddit: MessageSquare,
  tumblr: ImageIcon,
  code: Code,
  news: FileText,
  image: ImageIcon,
  user: User,
  shield: ShieldAlert,
  send: Send,
  gamepad: Gamepad2,
  video: Video,
  message: MessageSquare,
  music: Music,
  twitter: Twitter,
};

const CATEGORY_LABELS: Record<string, string> = {
  developer: "Developer",
  social: "Social",
  creative: "Creative",
  gaming: "Gaming",
  forum: "Forums",
  blog: "Blog",
  professional: "Professional",
  messaging: "Messaging",
  video: "Video",
};

const CATEGORY_COLORS: Record<string, string> = {
  developer: "from-blue-400/30 to-blue-400/5 text-blue-300 ring-blue-400/30",
  social: "from-pink-400/30 to-pink-400/5 text-pink-300 ring-pink-400/30",
  creative: "from-purple-400/30 to-purple-400/5 text-purple-300 ring-purple-400/30",
  gaming: "from-green-400/30 to-green-400/5 text-green-300 ring-green-400/30",
  forum: "from-orange-400/30 to-orange-400/5 text-orange-300 ring-orange-400/30",
  blog: "from-yellow-400/30 to-yellow-400/5 text-yellow-300 ring-yellow-400/30",
  professional: "from-cyan-400/30 to-cyan-400/5 text-cyan-300 ring-cyan-400/30",
  messaging: "from-indigo-400/30 to-indigo-400/5 text-indigo-300 ring-indigo-400/30",
  video: "from-red-400/30 to-red-400/5 text-red-300 ring-red-400/30",
};

const WORKER_URL = "https://behindtheemail-osint.mahmoudalabsi0599.workers.dev";

const SCAN_STEPS = [
  { label: "Validating email format & domain",          icon: Mail },
  { label: "Resolving MX records via Cloudflare DNS",  icon: Server },
  { label: "Querying Gravatar profile + avatar",        icon: Camera },
  { label: "Searching GitHub public emails",            icon: Github },
  { label: "Scanning HaveIBeenPwned breach corpus",    icon: ShieldAlert },
  { label: "Probing 25+ services for account matches",  icon: Globe },
  { label: "Aggregating avatars & building timeline",   icon: Award },
  { label: "Cross-referencing & compiling report",      icon: Check },
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
      const stepTimers: ReturnType<typeof setTimeout>[] = [];
      SCAN_STEPS.forEach((_, i) => {
        const t = setTimeout(() => {
          if (!cancelledRef.current) setScanStep(i);
        }, 300 * i + (i === 4 ? 200 : 0));
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
    bannerUrl?: string;
    followerCount?: number;
    postCount?: number;
    verified?: boolean;
  };

  function buildCards(d: LookupResult): Card[] {
    const cards: Card[] = [];

    if (d.mx.hasMx) {
      cards.push({
        title: "Mail Provider", source: `dns-query / ${d.validation.domain}`,
        icon: Server, matchStrength: "strong",
        fields: [
          { label: "Provider", value: d.mx.provider || d.mx.mxRecords[0] || "Unknown" },
          { label: "MX count", value: String(d.mx.mxRecords.length) },
          { label: "Primary MX", value: d.mx.mxRecords[0] || "—" },
          { label: "Domain", value: d.validation.domain },
        ],
      });
    }

    if (d.gravatar.exists) {
      cards.push({
        title: "Gravatar Profile", source: "gravatar.com",
        icon: Camera, matchStrength: "strong", photoUrl: d.gravatar.photoUrl || undefined,
        fields: [
          { label: "Display name", value: d.gravatar.displayName || "—" },
          { label: "About", value: d.gravatar.about || "—" },
          { label: "Hash", value: d.gravatar.hash },
          ...(d.gravatar.accounts || []).slice(0, 3).map((a) => ({
            label: a.shortname, value: a.display,
          })),
        ],
      });
    }

    if (d.github.found) {
      cards.push({
        title: "GitHub Activity", source: `github.com/${d.github.login}`,
        icon: Github, matchStrength: "strong", photoUrl: d.github.avatarUrl || undefined,
        followerCount: d.github.followers ?? undefined,
        postCount: d.github.publicRepos ?? undefined,
        fields: [
          { label: "Username", value: d.github.login || "—" },
          { label: "Name", value: d.github.name || "—" },
          { label: "Bio", value: d.github.bio || "—" },
          { label: "Company", value: d.github.company || "—" },
          { label: "Location", value: d.github.location || "—" },
          { label: "Blog", value: d.github.blog || "—" },
          { label: "Twitter", value: d.github.twitterUsername ? `@${d.github.twitterUsername}` : "—" },
          { label: "Public repos", value: String(d.github.publicRepos ?? "—") },
          { label: "Public gists", value: String(d.github.publicGists ?? "—") },
          { label: "Followers", value: d.github.followers != null ? d.github.followers.toLocaleString() : "—" },
          { label: "Following", value: d.github.following != null ? d.github.following.toLocaleString() : "—" },
          { label: "Joined", value: d.github.createdAt ? d.github.createdAt.slice(0, 10) : "—" },
        ],
      });
    }

    for (const s of d.services) {
      if (!s.matched) continue;
      if (s.service === "Gravatar" || s.service === "GitHub") continue;
      cards.push({
        title: s.service, source: s.profileUrl,
        icon: SERVICE_ICONS[s.icon] || Globe,
        matchStrength: s.confidence === "high" ? "strong" : s.confidence === "medium" ? "moderate" : "weak",
        photoUrl: s.avatarUrl, bannerUrl: s.bannerUrl,
        followerCount: s.followerCount, postCount: s.postCount,
        verified: s.verified,
        fields: [
          { label: "Username", value: s.username || "—" },
          ...(s.displayName ? [{ label: "Display name", value: s.displayName }] : []),
          ...(s.bio ? [{ label: "Bio", value: s.bio }] : []),
          ...(s.location ? [{ label: "Location", value: s.location }] : []),
          ...(s.joinedAt ? [{ label: "Joined", value: s.joinedAt }] : []),
          ...(s.followerCount != null ? [{ label: "Followers", value: s.followerCount.toLocaleString() }] : []),
          ...(s.postCount != null ? [{ label: "Posts", value: s.postCount.toLocaleString() }] : []),
          ...(s.extra ? Object.entries(s.extra).map(([k, v]) => ({
            label: k.replace(/_/g, " "), value: v,
          })) : []),
          { label: "Match type", value: s.matchType === "email" ? "Email-based (definitive)" : "Username-guess (heuristic)" },
        ],
      });
    }

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
                  {error ? "Lookup failed" : loading ? "Scanning live sources" : "Search complete · live data"}
                </p>
                <p className="text-sm font-mono break-all">{email}</p>
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
            <p className="text-xs text-text-accent mb-5 max-w-md mx-auto">{error}</p>
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

            {/* Identity banner with hero photo */}
            <IdentityBanner data={data} />

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Sources matched" value={String(data.sourcesMatched)} icon={TrendingUp} />
              <StatCard label="Accounts found" value={`${data.matchedAccounts}/${data.totalServices}`} icon={Users} />
              <StatCard label="Avatars collected" value={String(data.identityPhotos.length)} icon={Camera} />
              <StatCard label="Breaches found" value={data.hibp.checked ? String(data.hibp.count) : "—"} icon={ShieldAlert} />
            </div>

            {/* Photo Wall - aggregated avatars */}
            {data.identityPhotos.length > 0 && (
              <PhotoWall photos={data.identityPhotos} />
            )}

            {/* Timeline */}
            {data.timeline.length > 0 && (
              <Timeline timeline={data.timeline} />
            )}

            {/* Services matrix */}
            <ServicesMatrix services={data.services} probesByCategory={data.probesByCategory} />

            {/* Category breakdown bar */}
            <CategoryBreakdown services={data.services} />

            {/* Detailed cards */}
            {buildCards(data).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 text-text-accent flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Detailed profiles
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {buildCards(data).map((card, idx) => (
                    <DetailedCard key={card.title + idx} card={card} idx={idx} />
                  ))}
                </div>
              </div>
            )}

            {/* HIBP error notice */}
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
                against public APIs (Cloudflare DNS, Gravatar, GitHub, HaveIBeenPwned, Reddit, Tumblr,
                GitLab, Bitbucket, HackerNews, Keybase, Medium, Pastebin, Dev.to, About.me, Pinterest,
                Instagram, Telegram, Steam, Roblox, Twitch, TikTok, Twitter/X, Facebook, YouTube, SoundCloud).
                No data is stored. The Worker is open-source at{" "}
                <code className="font-mono text-brand-primary">worker/src/index.ts</code>.
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

// ----------------- Sub-components -----------------

function IdentityBanner({ data }: { data: LookupResult }) {
  const primaryPhoto = data.identityPhotos[0]?.url || data.gravatar.photoUrl || data.github.avatarUrl;
  const displayName = data.github.name || data.gravatar.displayName || data.github.login || data.validation.localPart;
  const followerCount = data.github.followers ?? undefined;

  return (
    <div className="relative rounded-2xl glass-strong p-5 sm:p-7 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 hero-glow opacity-30 pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="relative shrink-0">
          {primaryPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryPhoto}
              alt="Avatar"
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl ring-2 ring-brand-primary/40 object-cover shadow-xl shadow-brand-primary/20"
            />
          ) : (
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-brand-primary/30 to-brand-primary/5 ring-2 ring-brand-primary/40 flex items-center justify-center text-3xl font-bold text-brand-primary">
              {(data.validation.localPart[0] || "?").toUpperCase()}
            </div>
          )}
          {data.sourcesMatched >= 2 && (
            <span className="absolute -bottom-1.5 -right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-[10px] text-[#081016] font-bold ring-2 ring-[#0B1117]">
              ✓
            </span>
          )}
          {/* Photo count badge */}
          {data.identityPhotos.length > 1 && (
            <span className="absolute -top-1.5 -right-1.5 inline-flex h-6 px-1.5 items-center justify-center rounded-full bg-[#192229] ring-1 ring-white/15 text-[10px] font-mono text-brand-primary">
              +{data.identityPhotos.length - 1}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-2xl sm:text-3xl font-bold break-all">{displayName}</h3>
            <span className="font-mono text-xs text-text-accent break-all">{data.email}</span>
          </div>
          {data.github.bio && (
            <p className="mt-1 text-sm text-text-accent italic">{data.github.bio}</p>
          )}
          <p className="mt-2 text-sm text-text-accent">{data.summary}</p>
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
            {followerCount != null && followerCount > 0 && (
              <span className="rounded-full bg-blue-400/10 ring-1 ring-blue-400/30 px-2.5 py-0.5 text-blue-300">
                <Users className="inline h-3 w-3 mr-1" /> {followerCount.toLocaleString()} followers
              </span>
            )}
            {data.validation.isServiceEmail && (
              <span className="rounded-full bg-purple-400/10 text-purple-300 ring-1 ring-purple-300/30 px-2.5 py-0.5">
                Service email ({data.validation.serviceType}@)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoWall({ photos }: { photos: IdentityPhoto[] }) {
  return (
    <div className="rounded-2xl glass p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Camera className="h-4 w-4 text-brand-primary" />
        <h3 className="text-sm font-semibold">Identity Photo Wall</h3>
        <span className="text-[11px] text-text-accent">· {photos.length} avatars collected from matched accounts</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
        {photos.map((p, i) => (
          <a
            key={p.service + i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square rounded-xl overflow-hidden ring-1 ring-white/10 hover:ring-brand-primary/40 transition-all lift-on-hover"
            title={`${p.service} avatar — click to view full size`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={`${p.service} avatar`}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                // Fallback: show service initial
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent && !parent.querySelector(".fallback")) {
                  const div = document.createElement("div");
                  div.className = "fallback absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02] text-text-accent/40 font-semibold";
                  div.textContent = p.service[0];
                  parent.appendChild(div);
                }
              }}
            />
            <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 text-[9px] font-medium text-white truncate">
              {p.service}
            </span>
          </a>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-text-accent/70">
        Click any avatar to view the full-size original. Hover to highlight. If a service doesn&apos;t expose an avatar publicly, no photo will appear.
      </p>
    </div>
  );
}

function Timeline({ timeline }: { timeline: TimelineEvent[] }) {
  return (
    <div className="rounded-2xl glass p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-brand-primary" />
        <h3 className="text-sm font-semibold">Digital Footprint Timeline</h3>
        <span className="text-[11px] text-text-accent">· {timeline.length} dated events</span>
      </div>
      <div className="relative pl-4">
        {/* Vertical line */}
        <div className="absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-brand-primary/40 via-white/10 to-transparent" />
        <div className="space-y-3">
          {timeline.map((ev, i) => (
            <div key={i} className="relative flex items-start gap-3 animate-slide-in" style={{ animationDelay: `${i * 50}ms` }}>
              {/* Dot */}
              <span className={`absolute -left-4 top-2 inline-flex h-2 w-2 rounded-full ring-2 ring-[#0B1117] bg-gradient-to-br ${CATEGORY_COLORS[ev.category] || "bg-brand-primary"}`} />
              <div className="flex-1 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={ev.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-text-primary hover:text-brand-primary transition-colors truncate"
                  >
                    {ev.service}
                  </a>
                  <p className="text-[10px] text-text-accent/70 font-mono">{ev.date}</p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ring-1 bg-gradient-to-br ${CATEGORY_COLORS[ev.category] || "bg-white/5 ring-white/10"}`}>
                  {CATEGORY_LABELS[ev.category] || ev.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServicesMatrix({ services, probesByCategory }: { services: ServiceProbe[]; probesByCategory: Record<string, number> }) {
  const byCategory: Record<string, ServiceProbe[]> = {};
  for (const s of services) {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  }

  const matchedCount = services.filter((s) => s.matched).length;
  const totalCount = services.length;

  return (
    <div className="rounded-2xl glass p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Services &amp; accounts probed</h3>
          <p className="text-[11px] text-text-accent mt-0.5">
            Each service was checked for an account matching this email or its local-part as username.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-brand-gradient">{matchedCount}/{totalCount}</p>
          <p className="text-[10px] text-text-accent uppercase tracking-wider">matched</p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(byCategory).map(([cat, items]) => {
          const matchedInCat = items.filter((i) => i.matched).length;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wider text-text-accent/70 flex items-center gap-2">
                  <span className={`inline-flex h-2 w-2 rounded-full bg-gradient-to-br ${CATEGORY_COLORS[cat] || "bg-white/20"}`} />
                  {CATEGORY_LABELS[cat] || cat}
                </p>
                <span className="text-[10px] text-text-accent/70">
                  {matchedInCat}/{items.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {items.map((s) => {
                  const Icon = SERVICE_ICONS[s.icon] || Globe;
                  return (
                    <a
                      key={s.service}
                      href={s.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center gap-2 px-3 py-2 rounded-lg ring-1 transition-all ${
                        s.matched
                          ? "bg-brand-primary/10 ring-brand-primary/30 hover:bg-brand-primary/15"
                          : "bg-white/[0.02] ring-white/5 hover:ring-white/10"
                      }`}
                      title={s.matched ? `Match found — ${s.matchType === "email" ? "email-based" : "username-guess"}` : "No account found"}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${s.matched ? "text-brand-primary" : "text-text-accent/50"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${s.matched ? "text-text-primary" : "text-text-accent/70"}`}>
                          {s.service}
                        </p>
                        {s.matched && s.username && (
                          <p className="text-[10px] font-mono text-text-accent truncate">@{s.username}</p>
                        )}
                      </div>
                      {s.matched ? (
                        <Check className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-text-accent/40 shrink-0" />
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center gap-4 text-[10px] text-text-accent/70">
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-3 w-3 text-brand-primary" /> Account found
        </span>
        <span className="inline-flex items-center gap-1.5">
          <X className="h-3 w-3 text-text-accent/40" /> No account
        </span>
        <span className="text-text-accent/50">
          Note: For services without email-based lookup, the email&apos;s local-part is used as a username guess.
          Matches marked &ldquo;username-guess&rdquo; should be verified manually.
        </span>
      </div>
    </div>
  );
}

function CategoryBreakdown({ services }: { services: ServiceProbe[] }) {
  const total = services.length;
  const matched = services.filter((s) => s.matched).length;
  if (total === 0) return null;

  // Calculate category stats
  const stats: Array<{ cat: string; total: number; matched: number }> = [];
  const byCat: Record<string, ServiceProbe[]> = {};
  for (const s of services) {
    if (!byCat[s.category]) byCat[s.category] = [];
    byCat[s.category].push(s);
  }
  for (const [cat, items] of Object.entries(byCat)) {
    stats.push({
      cat,
      total: items.length,
      matched: items.filter((i) => i.matched).length,
    });
  }
  stats.sort((a, b) => b.matched - a.matched || b.total - a.total);

  return (
    <div className="rounded-2xl glass p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-brand-primary" />
        <h3 className="text-sm font-semibold">Category breakdown</h3>
        <span className="text-[11px] text-text-accent">· where this email shows up online</span>
      </div>
      <div className="space-y-3">
        {stats.map((s) => {
          const pct = s.total > 0 ? (s.matched / s.total) * 100 : 0;
          const colorClass = CATEGORY_COLORS[s.cat] || "bg-white/20 ring-white/10";
          return (
            <div key={s.cat}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-accent">{CATEGORY_LABELS[s.cat] || s.cat}</span>
                <span className="font-mono text-text-accent/80">{s.matched}/{s.total}</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${colorClass.split(" ").filter(c => c.includes("from-") || c.includes("to-") || c.includes("text-")).join(" ") || "from-brand-primary/40 to-brand-primary"} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailedCard({ card, idx }: { card: any; idx: number }) {
  const Icon = card.icon;
  const badge = MATCH_BADGE[card.matchStrength] || MATCH_BADGE.weak;
  return (
    <div
      className="rounded-xl glass p-4 lift-on-hover animate-slide-in relative overflow-hidden"
      style={{ animationDelay: `${idx * 60}ms` }}
    >
      {/* Banner */}
      {card.bannerUrl && (
        <div className="absolute inset-x-0 top-0 h-16 overflow-hidden opacity-30 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.bannerUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10 overflow-hidden shrink-0">
            {card.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{card.title}</p>
            <p className="text-[10px] text-text-accent/70 font-mono truncate max-w-[140px]">{card.source}</p>
          </div>
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ring-1 ${badge.color}`}>
          {badge.label}
        </span>
      </div>
      <div className="space-y-1.5">
        {card.fields.map((f: any, i: number) => (
          <div key={i} className="flex items-start gap-2 py-0.5">
            <span className="text-[10px] uppercase tracking-wider text-text-accent/70 w-24 shrink-0 pt-0.5 break-words">
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
}

const MATCH_BADGE: Record<string, { label: string; color: string }> = {
  strong:    { label: "Strong match",    color: "text-brand-primary bg-brand-primary/10 ring-brand-primary/30" },
  moderate:  { label: "Moderate match",  color: "text-yellow-300 bg-yellow-300/10 ring-yellow-300/30" },
  weak:      { label: "Weak signal",     color: "text-text-accent bg-white/5 ring-white/10" },
  none:      { label: "No match",        color: "text-text-accent/50 bg-white/5 ring-white/10" },
};

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-xl glass p-4 text-center relative overflow-hidden">
      <Icon className="absolute top-2 right-2 h-3 w-3 text-brand-primary/30" />
      <p className="text-2xl sm:text-3xl font-bold text-brand-gradient">{value}</p>
      <p className="mt-1 text-[10px] text-text-accent uppercase tracking-wider">{label}</p>
    </div>
  );
}
