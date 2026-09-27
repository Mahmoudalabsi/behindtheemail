/**
 * BehindTheEmail OSINT Worker — Extended
 *
 * Real email intelligence lookups, run on Cloudflare's edge.
 *
 * GET /api/lookup?email=foo@bar.com
 *   → returns aggregated public signals for the email:
 *     - Email validation (format + MX records on the domain)
 *     - Gravatar profile + photo (free, no key)
 *     - GitHub user search (by public email)
 *     - HaveIBeenPwned breaches (requires HIBP_API_TOKEN secret)
 *     - Username-based probes for 15+ services (GitLab, Bitbucket,
 *       HackerNews, Keybase, Medium, Pastebin, Dev.to, Steam,
 *       About.me, Twitch, Roblox, Pinterest, Tumblr, Reddit, Imgur)
 *
 * All requests are anonymous and run on Cloudflare Workers.
 */

export interface Env {
  HIBP_API_TOKEN?: string; // optional — set via `wrangler secret put HIBP_API_TOKEN`
  IMGUR_CLIENT_ID?: string; // optional — set via `wrangler secret put IMGUR_CLIENT_ID`
}

interface CorsHeaders {
  "Access-Control-Allow-Origin": string;
  "Access-Control-Allow-Methods": string;
  "Access-Control-Allow-Headers": string;
  "Content-Type": string;
}
const CORS: CorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

// ---------- MD5 (Gravatar) ----------

function md5(input: string): string {
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

  return hex(md51(unescape(encodeURIComponent(input))));
}

// ---------- Email validation & MX ----------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailValidation {
  valid: boolean;
  localPart: string;
  domain: string;
  isServiceEmail: boolean;
  serviceType: string | null;
}

const SERVICE_PREFIXES = [
  "info", "admin", "administrator", "support", "help", "contact", "sales",
  "noreply", "no-reply", "donotreply", "do-not-reply", "postmaster",
  "webmaster", "abuse", "security", "team", "hello", "mail", "office",
  "notifications", "newsletter", "billing", "service", "customer", "care",
];

function parseEmail(email: string): EmailValidation {
  const e = (email || "").trim().toLowerCase();
  const valid = EMAIL_RE.test(e);
  const [localPart = "", domain = ""] = e.split("@");
  let isServiceEmail = false;
  let serviceType: string | null = null;
  if (localPart) {
    const clean = localPart.replace(/[0-9]+$/, "").replace(/[._-]+$/, "");
    if (SERVICE_PREFIXES.includes(clean)) {
      isServiceEmail = true;
      serviceType = clean;
    }
  }
  return { valid, localPart, domain, isServiceEmail, serviceType };
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
    const j = (await r.json()) as any;
    const records: string[] = (j.Answer || [])
      .filter((a: any) => a.type === 15)
      .map((a: any) => {
        const parts = (a.data || "").toString().split(" ");
        return parts[parts.length - 1].replace(/\.$/, "");
      });
    const hasMx = records.length > 0;
    let provider: string | null = null;
    if (hasMx) {
      const mx = records[0].toLowerCase();
      if (mx.includes("google") || mx.includes("gmail")) provider = "Google Workspace / Gmail";
      else if (mx.includes("outlook") || mx.includes("microsoft") || mx.includes("protection.outlook")) provider = "Microsoft 365";
      else if (mx.includes("proton")) provider = "Proton Mail";
      else if (mx.includes("zoho")) provider = "Zoho Mail";
      else if (mx.includes("yahoo")) provider = "Yahoo Mail";
      else if (mx.includes("icloud") || mx.includes("apple")) provider = "Apple iCloud";
      else if (mx.includes("mailgun")) provider = "Mailgun (transactional)";
      else if (mx.includes("sendgrid")) provider = "SendGrid (transactional)";
      else if (mx.includes("amazonaws")) provider = "Amazon SES (transactional)";
      else if (mx.includes("mailchimp")) provider = "Mailchimp";
      else if (mx.includes("fastmail")) provider = "Fastmail";
      else if (mx.includes("yandex")) provider = "Yandex";
      else if (mx.includes("tutanota")) provider = "Tutanota";
      else if (mx.includes("gmx")) provider = "GMX";
      else if (mx.includes("qq")) provider = "QQ Mail";
      else if (mx.includes("163") || mx.includes("126")) provider = "NetEase Mail";
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

  try {
    const avatarRes = await fetch(photoUrl, { method: "HEAD", cf: { cacheTtl: 3600 } });
    if (avatarRes.ok) {
      result.exists = true;
      result.photoUrl = photoUrl;
    }
  } catch { /* ignore */ }

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
    return { checked: false, count: 0, breaches: [], error: "No HIBP_API_TOKEN configured (set via `wrangler secret put HIBP_API_TOKEN`)" };
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
    const j = (await res.json()) as any[];
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

// ---------- Username-based probes for 15+ services ----------
// We use the email's local part as the username guess. For each service,
// we hit a public profile endpoint and check if it returns 200/exists.

interface ServiceProbe {
  service: string;
  category: "developer" | "social" | "creative" | "gaming" | "forum" | "blog" | "professional" | "messaging";
  icon: string;
  profileUrl: string;
  matched: boolean;
  matchType: "email" | "username-guess";  // email = definitive, username-guess = heuristic
  confidence: "high" | "medium" | "low";
  username?: string;
  avatarUrl?: string;
  displayName?: string;
  bio?: string;
  location?: string;
  joinedAt?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  extra?: Record<string, string>;
}

const HEADERS_BROWSER = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36" };
const CF_CACHE = { cacheTtl: 3600, cacheEverything: true };

// Helper: just check if a URL returns 2xx (no parsing)
async function exists(url: string, opts: RequestInit = {}): Promise<boolean> {
  try {
    const r = await fetch(url, { ...opts, cf: CF_CACHE });
    return r.ok && r.status >= 200 && r.status < 300;
  } catch {
    return false;
  }
}

// ----- Developer platforms -----

async function probeGitLab(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "GitLab",
    category: "developer",
    icon: "github",
    profileUrl: `https://gitlab.com/${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "medium",
  };
  try {
    const r = await fetch(`https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER,
      cf: CF_CACHE,
    });
    if (r.ok) {
      const arr = (await r.json()) as any[];
      if (arr.length > 0) {
        const u = arr[0];
        probe.matched = true;
        probe.username = u.username;
        probe.displayName = u.name;
        probe.avatarUrl = u.avatar_url;
        probe.bio = u.bio || undefined;
        probe.location = u.location || undefined;
        probe.joinedAt = u.created_at?.slice(0, 10);
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeBitbucket(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Bitbucket",
    category: "developer",
    icon: "github",
    profileUrl: `https://bitbucket.org/${username}/`,
    matched: false,
    matchType: "username-guess",
    confidence: "medium",
  };
  try {
    const r = await fetch(`https://api.bitbucket.org/2.0/users/${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER,
      cf: CF_CACHE,
    });
    if (r.ok) {
      const u = (await r.json()) as any;
      probe.matched = true;
      probe.username = u.username;
      probe.displayName = u.display_name;
      probe.avatarUrl = u.links?.avatar?.href;
      probe.location = u.location || undefined;
      probe.joinedAt = u.created_on?.slice(0, 10);
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeHackerNews(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Hacker News",
    category: "forum",
    icon: "news",
    profileUrl: `https://news.ycombinator.com/user?id=${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "low",
  };
  try {
    const r = await fetch(`https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(username)}.json`, {
      cf: CF_CACHE,
    });
    if (r.ok) {
      const u = (await r.json()) as any;
      if (u && u.id) {
        probe.matched = true;
        probe.username = u.id;
        probe.joinedAt = new Date((u.created || 0) * 1000).toISOString().slice(0, 10);
        probe.postCount = (u.submitted || []).length;
        probe.bio = u.about?.replace(/<[^>]*>/g, "").slice(0, 200) || undefined;
        probe.extra = { Karma: String(u.karma ?? 0) };
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeKeybase(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Keybase",
    category: "messaging",
    icon: "shield",
    profileUrl: `https://keybase.io/${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "medium",
  };
  try {
    const r = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?usernames=${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER,
      cf: CF_CACHE,
    });
    if (r.ok) {
      const j = (await r.json()) as any;
      const u = j?.them?.[0];
      if (u && u.id) {
        probe.matched = true;
        probe.username = u.basics?.username;
        probe.displayName = u.profile?.full_name || undefined;
        probe.bio = u.profile?.bio || undefined;
        probe.location = u.profile?.location || undefined;
        probe.joinedAt = u.basics?.ctime?.toString().slice(0, 10);
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeDevTo(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Dev.to",
    category: "blog",
    icon: "code",
    profileUrl: `https://dev.to/${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "medium",
  };
  try {
    const r = await fetch(`https://dev.to/api/users/by_username?url=${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER,
      cf: CF_CACHE,
    });
    if (r.ok) {
      const u = (await r.json()) as any;
      if (u && (u.username || u.name)) {
        probe.matched = true;
        probe.username = u.username;
        probe.displayName = u.name;
        probe.avatarUrl = u.profile_image;
        probe.joinedAt = u.joined_at?.slice(0, 10);
      }
    }
  } catch { /* ignore */ }
  return probe;
}

// ----- Social / Blog platforms -----

async function probeMedium(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Medium",
    category: "blog",
    icon: "news",
    profileUrl: `https://medium.com/@${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "low",
  };
  try {
    // HEAD the profile URL — Medium returns 200 if exists
    const r = await fetch(`https://medium.com/@${username}`, {
      method: "HEAD",
      headers: HEADERS_BROWSER,
      cf: CF_CACHE,
    });
    if (r.ok) {
      probe.matched = true;
      probe.username = username;
    }
  } catch { /* ignore */ }
  return probe;
}

async function probePastebin(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Pastebin",
    category: "developer",
    icon: "code",
    profileUrl: `https://pastebin.com/u/${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "low",
  };
  // Pastebin returns 200 on existing user, 404 on missing
  const ok = await exists(`https://pastebin.com/u/${encodeURIComponent(username)}`, { headers: HEADERS_BROWSER });
  if (ok) {
    probe.matched = true;
    probe.username = username;
  }
  return probe;
}

async function probeAboutMe(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "About.me",
    category: "social",
    icon: "user",
    profileUrl: `https://about.me/${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "low",
  };
  const ok = await exists(`https://about.me/${encodeURIComponent(username)}`, { headers: HEADERS_BROWSER });
  if (ok) {
    probe.matched = true;
    probe.username = username;
  }
  return probe;
}

async function probePinterest(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Pinterest",
    category: "social",
    icon: "image",
    profileUrl: `https://www.pinterest.com/${username}/`,
    matched: false,
    matchType: "username-guess",
    confidence: "low",
  };
  // Pinterest returns 200 on existing profiles
  const ok = await exists(`https://www.pinterest.com/${encodeURIComponent(username)}/_created/`, { headers: HEADERS_BROWSER });
  if (ok) {
    probe.matched = true;
    probe.username = username;
  }
  return probe;
}

async function probeInstagram(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Instagram",
    category: "social",
    icon: "image",
    profileUrl: `https://www.instagram.com/${username}/`,
    matched: false,
    matchType: "username-guess",
    confidence: "low",
  };
  // Instagram is heavily rate-limited and login-walled.
  // We do a soft probe: HEAD the profile URL and check for 200 (not 404).
  // Note: Instagram may return 200 for non-existent users too (login wall).
  // So we explicitly mark confidence as "low".
  try {
    const r = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
      method: "HEAD",
      headers: HEADERS_BROWSER,
      cf: CF_CACHE,
    });
    if (r.ok) {
      probe.matched = true;
      probe.username = username;
      // We can't extract profile data without auth
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeTelegram(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Telegram",
    category: "messaging",
    icon: "send",
    profileUrl: `https://t.me/${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "low",
  };
  // Telegram t.me/<username> returns 200 with a page if the user exists, with a
  // "If you have Telegram, you can contact <username> right away" string.
  // If the user doesn't exist, the page contains "If you have Telegram, you can contact **@username** right away" too,
  // but with a different title/meta. The simplest check: 200 + page exists.
  try {
    const r = await fetch(`https://t.me/${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER,
      cf: CF_CACHE,
    });
    if (r.ok) {
      const html = await r.text();
      // Telegram returns a specific meta tag for non-existent users
      if (!html.includes("<meta name=\"twitter:title\" content=\"Telegram: Contact")) {
        // Heuristic: the page contains the username as a contact
        if (html.includes(`@${username}`) && !html.includes("can contact <strong>")) {
          // This is a sign the account exists
          probe.matched = true;
          probe.username = username;
        }
      }
    }
  } catch { /* ignore */ }
  return probe;
}

// ----- Gaming platforms -----

async function probeSteam(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Steam",
    category: "gaming",
    icon: "gamepad",
    profileUrl: `https://steamcommunity.com/id/${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "low",
  };
  // Steam returns 200 even for missing profiles, but the HTML differs.
  // The error page contains "The specified profile could not be found."
  try {
    const r = await fetch(`https://steamcommunity.com/id/${encodeURIComponent(username)}?xml=1`, {
      headers: HEADERS_BROWSER,
      cf: CF_CACHE,
    });
    if (r.ok) {
      const xml = await r.text();
      if (xml.includes("<steamID64>")) {
        probe.matched = true;
        probe.username = username;
        // Extract steamID from XML
        const m = xml.match(/<steamID>([^<]+)<\/steamID>/);
        if (m) probe.displayName = m[1];
        const av = xml.match(/<avatarMedium><!\[CDATA\[([^\]]+)\]\]><\/avatarMedium>/);
        if (av) probe.avatarUrl = av[1];
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeRoblox(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Roblox",
    category: "gaming",
    icon: "gamepad",
    profileUrl: `https://www.roblox.com/user.aspx?username=${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "low",
  };
  try {
    // Roblox: POST /v1/usernames/users to get user ID by username
    const r = await fetch(`https://users.roblox.com/v1/usernames/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...HEADERS_BROWSER },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
      cf: CF_CACHE,
    });
    if (r.ok) {
      const j = (await r.json()) as any;
      if (j?.data?.length > 0) {
        const u = j.data[0];
        probe.matched = true;
        probe.username = u.name;
        probe.displayName = u.displayName;
        probe.extra = { User_ID: String(u.id) };
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeTwitch(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Twitch",
    category: "gaming",
    icon: "video",
    profileUrl: `https://www.twitch.tv/${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "low",
  };
  // Twitch passport endpoint (lightweight, no auth)
  try {
    const r = await fetch(`https://passport.twitch.tv/usernames/${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER,
      cf: CF_CACHE,
    });
    if (r.ok) {
      const text = (await r.text()).trim();
      if (text === "1" || text.toLowerCase() === "true") {
        probe.matched = true;
        probe.username = username;
      }
    }
  } catch { /* ignore */ }
  return probe;
}

// ----- Forum / Creative platforms -----

async function probeReddit(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Reddit",
    category: "social",
    icon: "message",
    profileUrl: `https://www.reddit.com/user/${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "medium",
  };
  try {
    const r = await fetch(`https://www.reddit.com/user/${encodeURIComponent(username)}/about.json`, {
      headers: { "User-Agent": "BehindTheEmail/1.0" },
      cf: CF_CACHE,
    });
    if (r.ok) {
      const j = (await r.json()) as any;
      if (j?.data?.name) {
        probe.matched = true;
        probe.username = j.data.name;
        probe.avatarUrl = j.data.icon_img || j.data.snoovatar_img || undefined;
        probe.displayName = j.data.subreddit?.title || undefined;
        probe.bio = j.data.subreddit?.public_description || undefined;
        probe.joinedAt = new Date((j.data.created_utc || 0) * 1000).toISOString().slice(0, 10);
        probe.extra = { Karma: String(j.data.total_karma ?? j.data.link_karma ?? 0) };
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeTumblr(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Tumblr",
    category: "blog",
    icon: "image",
    profileUrl: `https://www.tumblr.com/${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "low",
  };
  try {
    const r = await fetch(`https://${encodeURIComponent(username)}.tumblr.com/api/read/json`, {
      headers: HEADERS_BROWSER,
      cf: CF_CACHE,
    });
    if (r.ok) {
      const text = await r.text();
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

async function probeImgur(username: string, clientId?: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Imgur",
    category: "social",
    icon: "image",
    profileUrl: `https://imgur.com/user/${username}`,
    matched: false,
    matchType: "username-guess",
    confidence: "low",
  };
  if (!clientId) {
    probe.extra = { Note: "Set IMGUR_CLIENT_ID for full data" };
  }
  try {
    const headers: Record<string, string> = { ...HEADERS_BROWSER };
    if (clientId) headers["Authorization"] = `Client-ID ${clientId}`;
    const r = await fetch(`https://api.imgur.com/3/account/${encodeURIComponent(username)}`, {
      headers,
      cf: CF_CACHE,
    });
    if (r.ok) {
      const j = (await r.json()) as any;
      if (j?.data?.url) {
        probe.matched = true;
        probe.username = j.data.url;
        probe.avatarUrl = j.data.avatar;
        probe.joinedAt = j.data.created?.toString().slice(0, 10);
        probe.extra = { Reputation: String(j.data.reputation ?? 0) };
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeGravatarService(gravatar: GravatarResult): Promise<ServiceProbe | null> {
  if (!gravatar.exists) return null;
  return {
    service: "Gravatar",
    category: "social",
    icon: "image",
    profileUrl: gravatar.profileUrl,
    matched: true,
    matchType: "email",
    confidence: "high",
    avatarUrl: gravatar.photoUrl || undefined,
    displayName: gravatar.displayName,
    bio: gravatar.about,
    extra: gravatar.accounts?.length ? { Linked_accounts: String(gravatar.accounts.length) } : undefined,
  };
}

async function probeGitHubService(github: GitHubResult): Promise<ServiceProbe | null> {
  if (!github.found) return null;
  return {
    service: "GitHub",
    category: "developer",
    icon: "github",
    profileUrl: github.profileUrl!,
    matched: true,
    matchType: "email",
    confidence: "high",
    username: github.login!,
    avatarUrl: github.avatarUrl ?? undefined,
    displayName: github.name ?? undefined,
    bio: github.bio ?? undefined,
    location: github.location ?? undefined,
    joinedAt: github.createdAt?.slice(0, 10),
    followerCount: github.followers ?? undefined,
    extra: {
      Public_repos: String(github.publicRepos ?? "?"),
      Company: github.company ?? "—",
    },
  };
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
  matchedAccounts: number;
  riskScore: "Low" | "Moderate" | "Elevated" | "High";
  summary: string;
  probesByCategory: Record<string, number>;
}

async function doLookup(email: string, env: Env): Promise<LookupResult> {
  const validation = parseEmail(email);
  const emailHash = md5(validation.localPart && validation.domain ? `${validation.localPart}@${validation.domain}` : email);
  const username = validation.localPart || "";

  const [mx, gravatar, github, hibp] = await Promise.all([
    lookupMx(validation.domain),
    lookupGravatar(emailHash),
    lookupGitHub(`${validation.localPart}@${validation.domain}`),
    lookupHIBP(`${validation.localPart}@${validation.domain}`, env.HIBP_API_TOKEN),
  ]);

  // Username-based probes — run all in parallel
  const probes: ServiceProbe[] = [];

  // Email-based probes first (high confidence)
  const grav = await probeGravatarService(gravatar);
  if (grav) probes.push(grav);
  const gh = await probeGitHubService(github);
  if (gh) probes.push(gh);

  // Username-based probes
  const usernameProbes = await Promise.all([
    probeGitLab(username),
    probeBitbucket(username),
    probeHackerNews(username),
    probeKeybase(username),
    probeDevTo(username),
    probeMedium(username),
    probePastebin(username),
    probeAboutMe(username),
    probePinterest(username),
    probeInstagram(username),
    probeTelegram(username),
    probeSteam(username),
    probeRoblox(username),
    probeTwitch(username),
    probeReddit(username),
    probeTumblr(username),
    probeImgur(username, env.IMGUR_CLIENT_ID),
  ]);
  for (const p of usernameProbes) if (p) probes.push(p);

  const matchedAccounts = probes.filter((p) => p.matched).length;
  const positiveServices = probes.filter((s) => s.matched);
  const sourcesMatched =
    (gravatar.exists ? 1 : 0) +
    (github.found ? 1 : 0) +
    (hibp.checked && hibp.count > 0 ? 1 : 0) +
    (mx.hasMx ? 1 : 0) +
    positiveServices.length;

  let riskScore: LookupResult["riskScore"] = "Low";
  if (hibp.checked) {
    if (hibp.count >= 5) riskScore = "High";
    else if (hibp.count >= 2) riskScore = "Elevated";
    else if (hibp.count >= 1) riskScore = "Moderate";
  }

  const probesByCategory: Record<string, number> = {};
  for (const p of probes) {
    if (p.matched) {
      probesByCategory[p.category] = (probesByCategory[p.category] || 0) + 1;
    }
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
    services: probes,
    sourcesMatched,
    matchedAccounts,
    riskScore,
    summary,
    probesByCategory,
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
        version: "2.0.0",
        services_probed: 20,
        endpoints: ["/api/lookup?email=foo@bar.com"],
        categories: ["developer", "social", "creative", "gaming", "forum", "blog", "professional", "messaging"],
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
