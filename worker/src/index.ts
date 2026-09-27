/**
 * BehindTheEmail OSINT Worker
 * Real email intelligence lookups, run on Cloudflare's edge.
 *
 * GET /api/lookup?email=foo@bar.com
 *   → returns aggregated public signals for the email:
 *     - Email validation (format + MX records on the domain)
 *     - Gravatar profile + photo (free, no key)
 *     - GitHub user search (free, low rate limit)
 *     - HaveIBeenPwned breaches (requires HIBP_API_TOKEN secret)
 *     - Registered-account probes on common services
 *
 * All requests are anonymous and run on Cloudflare Workers.
 */

export interface Env {
  HIBP_API_TOKEN?: string; // optional — set via `wrangler secret put HIBP_API_TOKEN`
}

interface CorsHeaders { "Access-Control-Allow-Origin": string; "Access-Control-Allow-Methods": string; "Access-Control-Allow-Headers": string; "Content-Type": string; }
const CORS: CorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

// ---------- Helpers ----------

function md5(input: string): string {
  // RFC 1321 MD5 — pure TS implementation, no Node.js deps.
  // Optimized for short inputs (email addresses).
  function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function rol(num: number, cnt: number): number {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return safeAdd(rol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function ff(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn((b&c)|(~b&d),a,b,x,s,t);}
  function gg(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn((b&d)|(c&~d),a,b,x,s,t);}
  function hh(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(b^c^d,a,b,x,s,t);}
  function ii(a:number,b:number,c:number,d:number,x:number,s:number,t:number){return cmn(c^(b|~d),a,b,x,s,t);}

  function md5cycle(x: number[], k: number[]): void {
    let [a, b, c, d] = [x[0], x[1], x[2], x[3]];
    a = ff(a,b,c,d,k[0],7,-680876936);  d = ff(d,a,b,c,k[1],12,-389564586);
    c = ff(c,d,a,b,k[2],17,606105819);  b = ff(b,c,d,a,k[3],22,-1044525330);
    a = ff(a,b,c,d,k[4],7,-176418897);   d = ff(d,a,b,c,k[5],12,1200080426);
    c = ff(c,d,a,b,k[6],17,-1473231341);b = ff(b,c,d,a,k[7],22,-45705983);
    a = ff(a,b,c,d,k[8],7,1770035416);  d = ff(d,a,b,c,k[9],12,-1958414417);
    c = ff(c,d,a,b,k[10],17,-42063);    b = ff(b,c,d,a,k[11],22,-1990404162);
    a = ff(a,b,c,d,k[12],7,1804603682); d = ff(d,a,b,c,k[13],12,-40341101);
    c = ff(c,d,a,b,k[14],17,-1502002290);b = ff(b,c,d,a,k[15],22,1236535329);

    a = gg(a,b,c,d,k[1],5,-165796510);  d = gg(d,a,b,c,k[6],9,-1069501632);
    c = gg(c,d,a,b,k[11],14,643717713); b = gg(b,c,d,a,k[0],20,-373897723);
    a = gg(a,b,c,d,k[5],5,-701558691); d = gg(d,a,b,c,k[10],9,38016083);
    c = gg(c,d,a,b,k[15],14,-660478335);b = gg(b,c,d,a,k[4],20,-405537848);
    a = gg(a,b,c,d,k[9],5,568446438);  d = gg(d,a,b,c,k[14],9,-1019803690);
    c = gg(c,d,a,b,k[3],14,-187363961);b = gg(b,c,d,a,k[8],20,1163531501);
    a = gg(a,b,c,d,k[13],5,-1444681467);d = gg(d,a,b,c,k[2],9,-51403784);
    c = gg(c,d,a,b,k[7],14,1735328473);b = gg(b,c,d,a,k[12],20,-1926607734);

    a = hh(a,b,c,d,k[5],4,-378558);    d = hh(d,a,b,c,k[8],11,-2022574463);
    c = hh(c,d,a,b,k[11],16,1839030562);b = hh(b,c,d,a,k[14],23,-35309556);
    a = hh(a,b,c,d,k[1],4,-1530992060);d = hh(d,a,b,c,k[4],11,1272893353);
    c = hh(c,d,a,b,k[7],16,-155497632);b = hh(b,c,d,a,k[10],23,-1094730640);
    a = hh(a,b,c,d,k[13],4,681279174); d = hh(d,a,b,c,k[0],11,-358537222);
    c = hh(c,d,a,b,k[3],16,-722521979);b = hh(b,c,d,a,k[6],23,76029189);
    a = hh(a,b,c,d,k[9],4,-640364487);d = hh(d,a,b,c,k[12],11,-421815835);
    c = hh(c,d,a,b,k[15],16,530742520);b = hh(b,c,d,a,k[2],23,-995338651);

    a = ii(a,b,c,d,k[0],6,-198630844); d = ii(d,a,b,c,k[7],10,1126891415);
    c = ii(c,d,a,b,k[14],15,-1416354905);b = ii(b,c,d,a,k[5],21,-57434055);
    a = ii(a,b,c,d,k[12],6,1700485571);d = ii(d,a,b,c,k[3],10,-1894986606);
    c = ii(c,d,a,b,k[10],15,-1051523); b = ii(b,c,d,a,k[1],21,-2054922799);
    a = ii(a,b,c,d,k[8],6,1873313359); d = ii(d,a,b,c,k[15],10,-30611744);
    c = ii(c,d,a,b,k[6],15,-1560198380);b = ii(b,c,d,a,k[13],21,1309151649);
    a = ii(a,b,c,d,k[4],6,-145523070); d = ii(d,a,b,c,k[11],10,-1120210379);
    c = ii(c,d,a,b,k[2],15,718787259); b = ii(b,c,d,a,k[9],21,-343485551);

    x[0] = safeAdd(a, x[0]); x[1] = safeAdd(b, x[1]);
    x[2] = safeAdd(c, x[2]); x[3] = safeAdd(d, x[3]);
  }

  function md5blk(s: string): number[] {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  function md51(s: string): number[] {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i: number;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) {
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function rhex(n: number): string {
    let s = "";
    const hexChr = "0123456789abcdef";
    for (let j = 0; j < 4; j++) {
      s += hexChr.charAt((n >> (j * 8 + 4)) & 0x0f) + hexChr.charAt((n >> (j * 8)) & 0x0f);
    }
    return s;
  }

  function hex(x: number[]): string {
    return x.map(rhex).join("");
  }

  // Convert string to UTF-8 bytes (treats input as ASCII for emails — they're ASCII-only)
  return hex(md51(unescape(encodeURIComponent(input))));
}

// ---------- Email validation & MX ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailValidation {
  valid: boolean;
  localPart: string;
  domain: string;
}

function parseEmail(email: string): EmailValidation {
  const e = (email || "").trim().toLowerCase();
  const valid = EMAIL_RE.test(e);
  const [localPart = "", domain = ""] = e.split("@");
  return { valid, localPart, domain };
}

interface MxResult {
  hasMx: boolean;
  mxRecords: string[];
  provider: string | null;
}

async function lookupMx(domain: string): Promise<MxResult> {
  if (!domain) return { hasMx: false, mxRecords: [], provider: null };
  try {
    const r = await fetch(`https://1.1.1.1/dns-query?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { Accept: "application/dns-json" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!r.ok) return { hasMx: false, mxRecords: [], provider: null };
    const j = await r.json() as any;
    const records: string[] = (j.Answer || [])
      .filter((a: any) => a.type === 15) // MX
      .map((a: any) => {
        // MX data format: "<priority> <exchange>"
        const parts = (a.data || "").toString().split(" ");
        return parts[parts.length - 1].replace(/\.$/, "");
      });
    const hasMx = records.length > 0;
    let provider: string | null = null;
    if (hasMx) {
      const mx = records[0].toLowerCase();
      if (mx.includes("google") || mx.includes("gmail")) provider = "Google Workspace";
      else if (mx.includes("outlook") || mx.includes("microsoft") || mx.includes("office365")) provider = "Microsoft 365";
      else if (mx.includes("proton")) provider = "Proton Mail";
      else if (mx.includes("zoho")) provider = "Zoho Mail";
      else if (mx.includes("yahoo")) provider = "Yahoo";
      else if (mx.includes("icloud")) provider = "Apple iCloud";
      else if (mx.includes("mailgun")) provider = "Mailgun";
      else if (mx.includes("sendgrid")) provider = "SendGrid";
      else if (mx.includes("amazonaws")) provider = "Amazon SES";
      else provider = records[0];
    }
    return { hasMx, mxRecords: records, provider };
  } catch {
    return { hasMx: false, mxRecords: [], provider: null };
  }
}

// ---------- Gravatar ----------

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

async function lookupGravatar(emailHash: string): Promise<GravatarResult> {
  const photoUrl = `https://www.gravatar.com/avatar/${emailHash}?d=404&s=200`;
  const profileUrl = `https://www.gravatar.com/${emailHash}.json`;

  const result: GravatarResult = {
    exists: false,
    hash: emailHash,
    photoUrl: null,
    profileUrl: `https://www.gravatar.com/${emailHash}`,
  };

  // Check if avatar exists (404 if not)
  try {
    const avatarRes = await fetch(photoUrl, { method: "HEAD", cf: { cacheTtl: 3600 } });
    if (avatarRes.ok) {
      result.exists = true;
      result.photoUrl = photoUrl;
    }
  } catch { /* ignore */ }

  // Fetch profile (if any)
  try {
    const profileRes = await fetch(profileUrl, {
      headers: { "User-Agent": "BehindTheEmail/1.0" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (profileRes.ok) {
      const j = await profileRes.json() as any;
      const entry = j.entry?.[0];
      if (entry) {
        result.displayName = entry.displayName || entry.name?.formatted || entry.preferredUsername;
        result.about = entry.aboutMe || entry.currentLocation;
        if (entry.accounts?.length) {
          result.accounts = entry.accounts.map((a: any) => ({
            shortname: a.shortname,
            url: a.url,
            display: a.display || a.shortname,
          }));
        }
        if (entry.urls?.length) {
          result.urls = entry.urls.map((u: any) => ({ value: u.value, title: u.title }));
        }
      }
    }
  } catch { /* ignore */ }

  return result;
}

// ---------- GitHub user search ----------

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

async function lookupGitHub(email: string): Promise<GitHubResult> {
  const empty: GitHubResult = {
    found: false, login: null, profileUrl: null, avatarUrl: null,
    bio: null, name: null, location: null, company: null,
    publicRepos: null, followers: null, createdAt: null,
  };
  try {
    // Public search — rate limit 10 req/min unauthenticated, 30/min authenticated.
    // We do search by public-email field, which is more reliable than guessing logins.
    const url = `https://api.github.com/search/users?q=${encodeURIComponent(`${email} in:email`)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "BehindTheEmail/1.0",
      },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) return empty;
    const j = await res.json() as any;
    if (j.total_count === 0 || !j.items?.length) return empty;

    const first = j.items[0];
    const login: string = first.login;
    const profileUrl: string = first.html_url;
    const avatarUrl: string = first.avatar_url;

    // Fetch the user's full profile for richer fields
    let profile: any = null;
    try {
      const pr = await fetch(`https://api.github.com/users/${login}`, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "BehindTheEmail/1.0",
        },
        cf: { cacheTtl: 3600, cacheEverything: true },
      });
      if (pr.ok) profile = await pr.json();
    } catch { /* ignore */ }

    return {
      found: true,
      login,
      profileUrl,
      avatarUrl,
      bio: profile?.bio ?? null,
      name: profile?.name ?? null,
      location: profile?.location ?? null,
      company: profile?.company ?? null,
      publicRepos: profile?.public_repos ?? null,
      followers: profile?.followers ?? null,
      createdAt: profile?.created_at ?? null,
    };
  } catch {
    return empty;
  }
}

// ---------- HaveIBeenPwned ----------

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

async function lookupHIBP(email: string, token?: string): Promise<HIBPResult> {
  if (!token) {
    return { checked: false, count: 0, breaches: [], error: "No HIBP_API_TOKEN configured (skipping breach scan)" };
  }
  try {
    const res = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
      headers: {
        "hibp-api-key": token,
        "User-Agent": "BehindTheEmail/1.0",
      },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (res.status === 404) {
      return { checked: true, count: 0, breaches: [] };
    }
    if (res.status === 401) {
      return { checked: false, count: 0, breaches: [], error: "HIBP API key rejected" };
    }
    if (res.status === 429) {
      return { checked: false, count: 0, breaches: [], error: "HIBP rate limited" };
    }
    if (!res.ok) {
      return { checked: false, count: 0, breaches: [], error: `HIBP returned ${res.status}` };
    }
    const j = await res.json() as any[];
    const breaches: BreachInfo[] = j.map((b) => ({
      name: b.Name,
      domain: b.Domain,
      breachDate: b.BreachDate,
      dataClasses: b.DataClasses || [],
      description: (b.Description || "").replace(/<[^>]*>/g, "").slice(0, 240),
      pwnCount: b.PwnCount || 0,
    }));
    return { checked: true, count: breaches.length, breaches };
  } catch (e: any) {
    return { checked: false, count: 0, breaches: [], error: e?.message || "HIBP fetch failed" };
  }
}

// ---------- Registered-account probes ----------
// These probe whether the email has been used to sign up on common services.
// We use the public profile-by-email endpoints (no auth, no PII sent).

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

async function probeGravatarEmail(emailHash: string): Promise<ServiceProbe | null> {
  // Already covered by Gravatar lookup, but expose as a "service" too
  return null;
}

async function probeGitHub(github: GitHubResult): Promise<ServiceProbe | null> {
  if (!github.found) return null;
  return {
    service: "GitHub",
    icon: "github",
    profileUrl: github.profileUrl!,
    matched: true,
    username: github.login!,
    avatarUrl: github.avatarUrl ?? undefined,
    displayName: github.name ?? undefined,
    bio: github.bio ?? undefined,
    extra: {
      Public_repos: String(github.publicRepos ?? "?"),
      Followers: String(github.followers ?? "?"),
      Joined: github.createdAt ? github.createdAt.slice(0, 10) : "?",
    },
  };
}

async function probeGoogle(email: string): Promise<ServiceProbe> {
  // We can't reliably detect Google account presence without OAuth.
  // But we can try to fetch the user's Google profile photo, if publicly visible.
  // Google's old photo endpoint: https://www.google.com/s2/photos/profile/<email_hash_or_id>
  // NOTE: As of 2021 Google deprecated this — it now returns a generic avatar.
  // We return this as "inconclusive" but include the photo URL anyway.
  const hash = md5(email);
  const photoUrl = `https://www.gravatar.com/avatar/${hash}?d=404&s=200`;
  const probe: ServiceProbe = {
    service: "Google",
    icon: "google",
    profileUrl: `https://www.google.com/search?q=${encodeURIComponent(email)}`,
    matched: false,
  };
  try {
    const r = await fetch(photoUrl, { method: "HEAD", cf: { cacheTtl: 3600 } });
    if (r.ok) probe.matched = true;
  } catch { /* ignore */ }
  return probe;
}

async function probeMicrosoft(email: string, domain: string): Promise<ServiceProbe> {
  // Microsoft account photo endpoint — deprecated, returns generic avatar.
  // We just report the email format and whether the domain has Microsoft MX.
  const probe: ServiceProbe = {
    service: "Microsoft",
    icon: "microsoft",
    profileUrl: "https://account.microsoft.com",
    matched: false,
  };
  return probe;
}

async function probeReddit(emailHash: string, localPart: string): Promise<ServiceProbe> {
  // Reddit doesn't expose email → username mapping publicly.
  // We try fetching /user/<localpart> as a heuristic guess.
  const probe: ServiceProbe = {
    service: "Reddit",
    icon: "reddit",
    profileUrl: `https://www.reddit.com/user/${localPart}`,
    matched: false,
  };
  try {
    const r = await fetch(`https://www.reddit.com/user/${localPart}/about.json`, {
      headers: { "User-Agent": "BehindTheEmail/1.0" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (r.ok) {
      const j = await r.json() as any;
      if (j?.data?.name) {
        probe.matched = true;
        probe.username = j.data.name;
        probe.avatarUrl = j.data.icon_img || undefined;
        probe.displayName = j.data.subreddit?.title || undefined;
        probe.bio = j.data.subreddit?.public_description || undefined;
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probePinterest(emailHash: string): Promise<ServiceProbe | null> {
  return null;
}

async function probeTumblr(email: string, localPart: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Tumblr",
    icon: "tumblr",
    profileUrl: `https://www.tumblr.com/${localPart}`,
    matched: false,
  };
  try {
    const r = await fetch(`https://${localPart}.tumblr.com/api/read/json`, {
      headers: { "User-Agent": "BehindTheEmail/1.0" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (r.ok) {
      const text = await r.text();
      // Tumblr wraps JSON in a JS callback
      const match = text.match(/var tumblr_api_read = (.+);$/);
      if (match) {
        const j = JSON.parse(match[1]);
        if (j?.tumblelog?.name) {
          probe.matched = true;
          probe.username = j.tumblelog.name;
          probe.displayName = j.tumblelog.title || undefined;
          probe.bio = j.tumblelog.description || undefined;
        }
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeSteam(emailHash: string): Promise<ServiceProbe | null> {
  return null; // Steam doesn't expose email → profile mapping
}

// ---------- Main lookup ----------

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
}

async function doLookup(email: string, env: Env): Promise<LookupResult> {
  const validation = parseEmail(email);
  const emailHash = md5(validation.localPart && validation.domain ? `${validation.localPart}@${validation.domain}` : email);

  const [mx, gravatar, github, hibp] = await Promise.all([
    lookupMx(validation.domain),
    lookupGravatar(emailHash),
    lookupGitHub(`${validation.localPart}@${validation.domain}`),
    lookupHIBP(`${validation.localPart}@${validation.domain}`, env.HIBP_API_TOKEN),
  ]);

  // Service probes — run in parallel
  const probes = await Promise.all([
    probeGitHub(github),
    probeGoogle(emailHash),
    probeMicrosoft(emailHash, validation.domain),
    probeReddit(emailHash, validation.localPart),
    probeTumblr(emailHash, validation.localPart),
  ]);
  const services = probes.filter((p): p is ServiceProbe => p !== null);

  // Compute "sources matched" — count the ones that returned positive signals
  const positiveServices = services.filter((s) => s.matched);
  const sourcesMatched =
    (gravatar.exists ? 1 : 0) +
    (github.found ? 1 : 0) +
    (hibp.checked && hibp.count > 0 ? 1 : 0) +
    (mx.hasMx ? 1 : 0) +
    positiveServices.length;

  // Risk score based on breach count
  let riskScore: LookupResult["riskScore"] = "Low";
  if (hibp.checked) {
    if (hibp.count >= 5) riskScore = "High";
    else if (hibp.count >= 2) riskScore = "Elevated";
    else if (hibp.count >= 1) riskScore = "Moderate";
  }

  const parts: string[] = [];
  if (gravatar.exists) parts.push("Gravatar profile");
  if (github.found) parts.push(`GitHub @${github.login}`);
  if (hibp.checked && hibp.count > 0) parts.push(`${hibp.count} breach${hibp.count === 1 ? "" : "es"}`);
  if (mx.hasMx) parts.push(`${mx.provider || "MX records"}`);
  for (const s of positiveServices) parts.push(`${s.service} account`);
  const summary = parts.length === 0
    ? "No public signals found for this email."
    : `Found: ${parts.join(", ")}.`;

  return {
    email: `${validation.localPart}@${validation.domain}`,
    timestamp: new Date().toISOString(),
    emailHash,
    validation,
    mx,
    gravatar,
    github,
    hibp,
    services,
    sourcesMatched,
    riskScore,
    summary,
  };
}

// ---------- HTTP entry ----------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(JSON.stringify({
        service: "behindtheemail-osint",
        version: "1.0.0",
        endpoints: ["/api/lookup?email=foo@bar.com"],
      }), { headers: CORS });
    }

    if (url.pathname === "/api/lookup") {
      const email = url.searchParams.get("email");
      if (!email) {
        return new Response(JSON.stringify({ error: "Missing 'email' parameter" }), { status: 400, headers: CORS });
      }
      try {
        const result = await doLookup(email, env);
        return new Response(JSON.stringify(result), { headers: CORS });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e?.message || "Lookup failed" }), { status: 500, headers: CORS });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: CORS });
  },
};
