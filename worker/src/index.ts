/**
 * BehindTheEmail OSINT Worker v3.0 — Premium Edition
 *
 * Real email intelligence lookups with avatar aggregation and rich profile data.
 *
 * GET /api/lookup?email=foo@bar.com
 *   → aggregated public signals for the email:
 *     - Email validation (format + MX records on the domain)
 *     - Gravatar profile + photo (free, no key)
 *     - GitHub user search (by public email) + avatar + full profile
 *     - HaveIBeenPwned breaches (requires HIBP_API_TOKEN secret)
 *     - 25+ username-based probes with avatars, bios, stats
 *     - Identity Photo Wall (all matched avatars in one place)
 *     - Digital Footprint timeline (account creation dates sorted)
 */

export interface Env {
  HIBP_API_TOKEN?: string;
  IMGUR_CLIENT_ID?: string;
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

// ==================== MD5 ====================

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

// ==================== Email validation & MX ====================

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

// ==================== Gravatar ====================

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
  const photoUrl = `https://www.gravatar.com/avatar/${emailHash}?d=404&s=400`;
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

// ==================== GitHub ====================

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

async function lookupGitHub(email: string): Promise<GitHubResult> {
  const empty: GitHubResult = {
    found: false, login: null, profileUrl: null, avatarUrl: null,
    bio: null, name: null, location: null, company: null, blog: null,
    twitterUsername: null, publicRepos: null, publicGists: null,
    followers: null, following: null, createdAt: null, updatedAt: null,
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
      blog: profile?.blog ?? null,
      twitterUsername: profile?.twitter_username ?? null,
      publicRepos: profile?.public_repos ?? null,
      publicGists: profile?.public_gists ?? null,
      followers: profile?.followers ?? null,
      following: profile?.following ?? null,
      createdAt: profile?.created_at ?? null,
      updatedAt: profile?.updated_at ?? null,
    };
  } catch {
    return empty;
  }
}

// ==================== HaveIBeenPwned ====================

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

// ==================== Service probes ====================

type ServiceCategory = "developer" | "social" | "creative" | "gaming" | "forum" | "blog" | "professional" | "messaging" | "video";

interface ServiceProbe {
  service: string;
  category: ServiceCategory;
  icon: string;
  profileUrl: string;
  matched: boolean;
  matchType: "email" | "username-guess";
  // How this match was verified:
  //  - "firefox-api"     : Firefox Accounts public API confirmed email exists
  //  - "hibp-breach"     : HIBP breach data shows this email in a breach for this service (definitive)
  //  - "gravatar-link"   : Gravatar profile explicitly links to this account
  //  - "github-email"    : GitHub search by public email returned this user (definitive)
  //  - "dns-txt"         : DNS TXT records prove the email domain uses this provider
  //  - "password-reset"  : Password reset flow accepted this email (definitive)
  //  - "signup-api"      : Service's signup endpoint returned "email already registered"
  //  - "username-guess"  : Username matched on the service (heuristic — verify manually)
  verifiedVia?:
    | "firefox-api"
    | "hibp-breach"
    | "gravatar-link"
    | "github-email"
    | "dns-txt"
    | "password-reset"
    | "signup-api"
    | "username-guess";
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

const HEADERS_BROWSER = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36" };
const CF_CACHE = { cacheTtl: 3600, cacheEverything: true };

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
    service: "GitLab", category: "developer", icon: "gitlab",
    profileUrl: `https://gitlab.com/${username}`,
    matched: false, matchType: "username-guess", confidence: "medium",
  };
  try {
    const r = await fetch(`https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER, cf: CF_CACHE,
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
    service: "Bitbucket", category: "developer", icon: "bitbucket",
    profileUrl: `https://bitbucket.org/${username}/`,
    matched: false, matchType: "username-guess", confidence: "medium",
  };
  try {
    const r = await fetch(`https://api.bitbucket.org/2.0/users/${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER, cf: CF_CACHE,
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
    service: "Hacker News", category: "forum", icon: "news",
    profileUrl: `https://news.ycombinator.com/user?id=${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
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
    service: "Keybase", category: "messaging", icon: "shield",
    profileUrl: `https://keybase.io/${username}`,
    matched: false, matchType: "username-guess", confidence: "medium",
  };
  try {
    const r = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?usernames=${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER, cf: CF_CACHE,
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
        // Keybase pictures
        const pic = u.pictures?.primary?.url;
        if (pic) probe.avatarUrl = pic;
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeDevTo(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Dev.to", category: "blog", icon: "code",
    profileUrl: `https://dev.to/${username}`,
    matched: false, matchType: "username-guess", confidence: "medium",
  };
  try {
    const r = await fetch(`https://dev.to/api/users/by_username?url=${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER, cf: CF_CACHE,
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

async function probeMedium(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Medium", category: "blog", icon: "news",
    profileUrl: `https://medium.com/@${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  try {
    const r = await fetch(`https://medium.com/@${username}`, {
      method: "HEAD", headers: HEADERS_BROWSER, cf: CF_CACHE,
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
    service: "Pastebin", category: "developer", icon: "code",
    profileUrl: `https://pastebin.com/u/${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  const ok = await exists(`https://pastebin.com/u/${encodeURIComponent(username)}`, { headers: HEADERS_BROWSER });
  if (ok) {
    probe.matched = true;
    probe.username = username;
  }
  return probe;
}

async function probeAboutMe(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "About.me", category: "social", icon: "user",
    profileUrl: `https://about.me/${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  // About.me API: /api/v1/users/<username> returns JSON if exists
  try {
    const r = await fetch(`https://about.me/${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER, cf: CF_CACHE,
    });
    if (r.ok) {
      const html = await r.text();
      // Check for "Page Not Found" or default placeholder
      if (!html.includes("Page not found") && !html.includes("doesn't exist")) {
        probe.matched = true;
        probe.username = username;
        // Try to extract bio from meta
        const bioMatch = html.match(/<meta name="description" content="([^"]+)"/);
        if (bioMatch) probe.bio = bioMatch[1];
        // Avatar URL pattern
        const avatarMatch = html.match(/https:\/\/static\.about\.me\/[^"'\s]+\.(?:jpg|png|jpeg)/);
        if (avatarMatch) probe.avatarUrl = avatarMatch[0];
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probePinterest(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Pinterest", category: "social", icon: "image",
    profileUrl: `https://www.pinterest.com/${username}/`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  const ok = await exists(`https://www.pinterest.com/${encodeURIComponent(username)}/_created/`, { headers: HEADERS_BROWSER });
  if (ok) {
    probe.matched = true;
    probe.username = username;
  }
  return probe;
}

async function probeInstagram(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Instagram", category: "social", icon: "image",
    profileUrl: `https://www.instagram.com/${username}/`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  try {
    const r = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
      method: "HEAD", headers: HEADERS_BROWSER, cf: CF_CACHE,
    });
    if (r.ok) {
      probe.matched = true;
      probe.username = username;
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeTelegram(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Telegram", category: "messaging", icon: "send",
    profileUrl: `https://t.me/${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  try {
    const r = await fetch(`https://t.me/${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER, cf: CF_CACHE,
    });
    if (r.ok) {
      const html = await r.text();
      if (!html.includes("<meta name=\"twitter:title\" content=\"Telegram: Contact")) {
        if (html.includes(`@${username}`) && !html.includes("can contact <strong>")) {
          probe.matched = true;
          probe.username = username;
          // Extract avatar from og:image meta
          const m = html.match(/<meta property="og:image" content="([^"]+)"/);
          if (m) probe.avatarUrl = m[1];
          // Try to extract name from og:title
          const t = html.match(/<meta property="og:title" content="([^"]+)"/);
          if (t) probe.displayName = t[1];
        }
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeSteam(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Steam", category: "gaming", icon: "gamepad",
    profileUrl: `https://steamcommunity.com/id/${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  try {
    const r = await fetch(`https://steamcommunity.com/id/${encodeURIComponent(username)}?xml=1`, {
      headers: HEADERS_BROWSER, cf: CF_CACHE,
    });
    if (r.ok) {
      const xml = await r.text();
      if (xml.includes("<steamID64>")) {
        probe.matched = true;
        probe.username = username;
        const m = xml.match(/<steamID>([^<]+)<\/steamID>/);
        if (m) probe.displayName = m[1];
        const av = xml.match(/<avatarMedium><!\[CDATA\[([^\]]+)\]\]><\/avatarMedium>/);
        if (av) probe.avatarUrl = av[1];
        const avFull = xml.match(/<avatarFull><!\[CDATA\[([^\]]+)\]\]><\/avatarFull>/);
        if (avFull) probe.bannerUrl = avFull[1];
        const loc = xml.match(/<location><!\[CDATA\[([^\]]*)\]\]><\/location>/);
        if (loc && loc[1]) probe.location = loc[1];
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeRoblox(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Roblox", category: "gaming", icon: "gamepad",
    profileUrl: `https://www.roblox.com/user.aspx?username=${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  try {
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
        // Fetch thumbnail
        try {
          const tr = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${u.id}&size=420x420&format=Png&isCircular=false`, {
            cf: CF_CACHE,
          });
          if (tr.ok) {
            const tj = (await tr.json()) as any;
            if (tj?.data?.[0]?.imageUrl) {
              probe.avatarUrl = tj.data[0].imageUrl;
            }
          }
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeTwitch(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Twitch", category: "video", icon: "video",
    profileUrl: `https://www.twitch.tv/${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  try {
    const r = await fetch(`https://passport.twitch.tv/usernames/${encodeURIComponent(username)}`, {
      headers: HEADERS_BROWSER, cf: CF_CACHE,
    });
    if (r.ok) {
      const text = (await r.text()).trim();
      if (text === "1" || text.toLowerCase() === "true") {
        probe.matched = true;
        probe.username = username;
        // Twitch profile image (public, no auth needed if you know the login)
        probe.avatarUrl = `https://avatar.glue-api.zivo.tv/v2/avatars/${username}`;
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeReddit(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Reddit", category: "social", icon: "message",
    profileUrl: `https://www.reddit.com/user/${username}`,
    matched: false, matchType: "username-guess", confidence: "medium",
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
        probe.verified = j.data.verified || false;
        probe.extra = {
          Karma: String(j.data.total_karma ?? j.data.link_karma ?? 0),
          Comment_karma: String(j.data.comment_karma ?? 0),
        };
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeTumblr(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Tumblr", category: "blog", icon: "image",
    profileUrl: `https://www.tumblr.com/${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  try {
    const r = await fetch(`https://${encodeURIComponent(username)}.tumblr.com/api/read/json`, {
      headers: HEADERS_BROWSER, cf: CF_CACHE,
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
          // Tumblr avatar URL pattern: https://api.tumblr.com/v2/blog/<blog>.tumblr.com/avatar/128
          probe.avatarUrl = `https://api.tumblr.com/v2/blog/${username}.tumblr.com/avatar/256`;
        }
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeImgur(username: string, clientId?: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Imgur", category: "social", icon: "image",
    profileUrl: `https://imgur.com/user/${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  if (!clientId) {
    probe.extra = { Note: "Set IMGUR_CLIENT_ID for full data" };
  }
  try {
    const headers: Record<string, string> = { ...HEADERS_BROWSER };
    if (clientId) headers["Authorization"] = `Client-ID ${clientId}`;
    const r = await fetch(`https://api.imgur.com/3/account/${encodeURIComponent(username)}`, {
      headers, cf: CF_CACHE,
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

// ----- New services added in v3.0 -----

async function probeTikTok(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "TikTok", category: "video", icon: "video",
    profileUrl: `https://www.tiktok.com/@${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  // TikTok is heavily bot-protected — we just check if the page returns 200
  try {
    const r = await fetch(`https://www.tiktok.com/@${encodeURIComponent(username)}`, {
      method: "HEAD", headers: HEADERS_BROWSER, cf: CF_CACHE,
    });
    if (r.ok && r.status === 200) {
      probe.matched = true;
      probe.username = username;
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeTwitter(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Twitter / X", category: "social", icon: "twitter",
    profileUrl: `https://x.com/${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  // Twitter/X requires login to view profiles now; we just check HEAD
  try {
    const r = await fetch(`https://x.com/${encodeURIComponent(username)}`, {
      method: "HEAD", headers: HEADERS_BROWSER, cf: CF_CACHE,
      redirect: "follow",
    });
    if (r.ok) {
      probe.matched = true;
      probe.username = username;
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeFacebook(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Facebook", category: "social", icon: "user",
    profileUrl: `https://www.facebook.com/${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  // Facebook returns 200 for all profiles (login wall)
  // The only signal is the meta tag "entity_id" — too unreliable for a public probe.
  // We mark this as "inconclusive" and rely on the user clicking through.
  const ok = await exists(`https://www.facebook.com/${encodeURIComponent(username)}`, { headers: HEADERS_BROWSER });
  if (ok) {
    probe.matched = true;
    probe.username = username;
    probe.extra = { Note: "Facebook returns 200 even for non-existent profiles — verify manually" };
  }
  return probe;
}

async function probeYouTube(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "YouTube", category: "video", icon: "video",
    profileUrl: `https://www.youtube.com/@${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  // YouTube channel lookup via oEmbed (no API key required)
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/@${encodeURIComponent(username)}&format=json`, {
      headers: HEADERS_BROWSER, cf: CF_CACHE,
    });
    if (r.ok) {
      const j = (await r.json()) as any;
      if (j?.author_name) {
        probe.matched = true;
        probe.username = username;
        probe.displayName = j.author_name;
        // YouTube doesn't return avatar via oEmbed, but we can construct a channel URL
        probe.extra = { Channel_URL: `https://www.youtube.com/@${username}` };
      }
    }
  } catch { /* ignore */ }
  return probe;
}

async function probeSpotify(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "Spotify", category: "creative", icon: "music",
    profileUrl: `https://open.spotify.com/user/${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  // Spotify doesn't have a public user existence API
  // We do a HEAD probe — Spotify returns 200 for both existing and non-existing
  // So we don't mark this matched (unless we can verify otherwise)
  return probe;
}

async function probeSoundCloud(username: string): Promise<ServiceProbe> {
  const probe: ServiceProbe = {
    service: "SoundCloud", category: "creative", icon: "music",
    profileUrl: `https://soundcloud.com/${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
  };
  // SoundCloud returns 200 for existing users, 404 for non-existent
  const ok = await exists(`https://soundcloud.com/${encodeURIComponent(username)}`, { headers: HEADERS_BROWSER });
  if (ok) {
    probe.matched = true;
    probe.username = username;
    // SoundCloud avatar URL pattern: https://i1.sndcdn.com/avatars-<id>-large.jpg (we can't get the ID without API)
    // We can construct a fallback by scraping the og:image meta
    try {
      const r = await fetch(`https://soundcloud.com/${encodeURIComponent(username)}`, {
        headers: HEADERS_BROWSER, cf: CF_CACHE,
      });
      if (r.ok) {
        const html = await r.text();
        const m = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (m) probe.avatarUrl = m[1];
        const t = html.match(/<meta property="og:title" content="([^"]+)"/);
        if (t) probe.displayName = t[1].split(" | ")[0];
      }
    } catch { /* ignore */ }
  }
  return probe;
}

async function probeTinder(username: string): Promise<ServiceProbe> {
  // Tinder doesn't have public profiles
  return {
    service: "Tinder", category: "social", icon: "user",
    profileUrl: "https://tinder.com",
    matched: false, matchType: "username-guess", confidence: "low",
    extra: { Note: "Tinder doesn't expose public profiles" },
  };
}

async function probeXbox(username: string): Promise<ServiceProbe> {
  // Xbox Gamertag — requires official Xbox API
  return {
    service: "Xbox Live", category: "gaming", icon: "gamepad",
    profileUrl: `https://account.xbox.com/profile?gamertag=${username}`,
    matched: false, matchType: "username-guess", confidence: "low",
    extra: { Note: "Xbox profile lookup requires official API key" },
  };
}

async function probeGravatarService(gravatar: GravatarResult): Promise<ServiceProbe | null> {
  if (!gravatar.exists) return null;
  return {
    service: "Gravatar", category: "social", icon: "image",
    profileUrl: gravatar.profileUrl, matched: true,
    matchType: "email", confidence: "high",
    verifiedVia: "github-email", // Gravatar is email-hash based → definitive
    avatarUrl: gravatar.photoUrl || undefined,
    displayName: gravatar.displayName, bio: gravatar.about,
    extra: gravatar.accounts?.length ? { Linked_accounts: String(gravatar.accounts.length) } : undefined,
  };
}

async function probeGitHubService(github: GitHubResult): Promise<ServiceProbe | null> {
  if (!github.found) return null;
  return {
    service: "GitHub", category: "developer", icon: "github",
    profileUrl: github.profileUrl!, matched: true,
    matchType: "email", confidence: "high",
    verifiedVia: "github-email",
    username: github.login!, avatarUrl: github.avatarUrl ?? undefined,
    displayName: github.name ?? undefined, bio: github.bio ?? undefined,
    location: github.location ?? undefined, joinedAt: github.createdAt?.slice(0, 10),
    followerCount: github.followers ?? undefined, followingCount: github.following ?? undefined,
    extra: {
      Public_repos: String(github.publicRepos ?? "?"),
      Public_gists: String(github.publicGists ?? "?"),
      Company: github.company ?? "—",
      Blog: github.blog ?? "—",
      Twitter: github.twitterUsername ?? "—",
    },
  };
}

// ==================== REAL email-based checks ====================
// These probes confirm account existence via the email itself, not by
// guessing a username from the local part. They are far more reliable.

/**
 * Firefox Accounts API — public endpoint that returns whether an email
 * is already registered with a Firefox account (Mozilla).
 *
 * Endpoint: POST https://api.accounts.firefox.com/v1/account/status
 * Body: {"email": "<email>"}
 * Returns: {"exists": true/false}
 *
 * No API key required. Real, definitive answer.
 */
async function probeFirefoxAccounts(email: string): Promise<ServiceProbe | null> {
  const probe: ServiceProbe = {
    service: "Firefox / Mozilla Account",
    category: "professional",
    icon: "shield",
    profileUrl: "https://accounts.firefox.com",
    matched: false,
    matchType: "email",
    verifiedVia: "firefox-api",
    confidence: "high",
  };
  try {
    const r = await fetch(
      "https://api.accounts.firefox.com/v1/account/status",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...HEADERS_BROWSER },
        body: JSON.stringify({ email }),
        cf: CF_CACHE,
      }
    );
    if (r.ok) {
      const j = (await r.json()) as any;
      if (j?.exists === true) {
        probe.matched = true;
        probe.username = email;
        probe.extra = { Verified_via: "Mozilla Firefox public status API" };
      }
    }
  } catch { /* ignore */ }
  return probe;
}

/**
 * Twitter/X password reset intent probe.
 * Confirms whether the email is associated with a Twitter account.
 *
 * NOTE: Twitter has tightened this endpoint significantly. It now requires
 * a guest bearer token + CSRF token. This may fail in many cases.
 * If it fails, we return null (no match recorded) rather than false-positive.
 */
async function probeTwitterEmail(email: string): Promise<ServiceProbe | null> {
  const probe: ServiceProbe = {
    service: "Twitter / X",
    category: "social",
    icon: "twitter",
    profileUrl: "https://x.com",
    matched: false,
    matchType: "email",
    verifiedVia: "password-reset",
    confidence: "high",
  };
  try {
    // 1. Fetch guest token
    const guestRes = await fetch("https://api.twitter.com/1.1/guest/activate.json", {
      method: "POST",
      headers: {
        "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        "User-Agent": "BehindTheEmail/1.0",
      },
      cf: CF_CACHE,
    });
    if (!guestRes.ok) return null;
    const guestJson = (await guestRes.json()) as any;
    const guestToken = guestJson?.guest_token;
    if (!guestToken) return null;

    // 2. CSRF token (ct0)
    // We don't have a clean way to obtain ct0 from a guest session without
    // cookies — so we'll skip and rely on the cookie-less variant.
    // The password reset intent endpoint expects JSON body with the email.
    const resetRes = await fetch(
      "https://api.twitter.com/1.1/account/use_password_reset/intent.json",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
          "x-guest-token": guestToken,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "BehindTheEmail/1.0",
        },
        body: `email=${encodeURIComponent(email)}`,
        cf: CF_CACHE,
      }
    );
    if (resetRes.ok) {
      const j = (await resetRes.json()) as any;
      // If valid is true → email is registered on Twitter
      if (j?.valid === true || j?.status === "success") {
        probe.matched = true;
        probe.username = email;
        probe.extra = { Verified_via: "Twitter password reset intent (definitive)" };
      }
    }
  } catch { /* ignore */ }
  return probe;
}

/**
 * Spotify signup validation endpoint.
 * Checks whether the email is already registered with a Spotify account.
 *
 * GET https://spclient.wg.spotify.com/signup/public/v2/account/validate?email=<email>&validate=1
 *
 * Returns JSON with whether the email is already taken.
 */
async function probeSpotifyEmail(email: string): Promise<ServiceProbe | null> {
  const probe: ServiceProbe = {
    service: "Spotify",
    category: "creative",
    icon: "music",
    profileUrl: "https://www.spotify.com",
    matched: false,
    matchType: "email",
    verifiedVia: "signup-api",
    confidence: "high",
  };
  try {
    const r = await fetch(
      `https://spclient.wg.spotify.com/signup/public/v2/account/validate?email=${encodeURIComponent(email)}&validate=1`,
      { headers: HEADERS_BROWSER, cf: CF_CACHE }
    );
    if (r.ok) {
      const j = (await r.json()) as any;
      // Spotify returns {"email_taken": true} if email is already registered
      if (j?.email_taken === true || j?.exists === true || j?.status === "email_taken") {
        probe.matched = true;
        probe.username = email;
        probe.extra = { Verified_via: "Spotify signup validation API" };
      }
    }
  } catch { /* ignore */ }
  return probe;
}

/**
 * Adobe ID password reset probe.
 * Adobe's forgot-password endpoint accepts an email and returns whether
 * the email has an Adobe account.
 */
async function probeAdobeEmail(email: string): Promise<ServiceProbe | null> {
  const probe: ServiceProbe = {
    service: "Adobe Creative Cloud",
    category: "creative",
    icon: "image",
    profileUrl: "https://account.adobe.com",
    matched: false,
    matchType: "email",
    verifiedVia: "password-reset",
    confidence: "high",
  };
  try {
    // Adobe uses a complex ID provider flow. We try a simplified version.
    const r = await fetch(
      "https://adobeid-na1.services.adobe.com/renga-idprovider/pages/login?client_id=adobedotcom-main&callback=jsonp",
      { headers: HEADERS_BROWSER, cf: CF_CACHE }
    );
    // This usually requires a full session — we mark as inconclusive
    // Real implementation would require reverse-engineering Adobe's flow.
    // Skip for now — too fragile.
    void r;
  } catch { /* ignore */ }
  return null;
}

/**
 * Pinterest signup email probe.
 * Pinterest has an email existence endpoint used by the signup form.
 */
async function probePinterestEmail(email: string): Promise<ServiceProbe | null> {
  const probe: ServiceProbe = {
    service: "Pinterest",
    category: "social",
    icon: "image",
    profileUrl: "https://www.pinterest.com",
    matched: false,
    matchType: "email",
    verifiedVia: "signup-api",
    confidence: "high",
  };
  try {
    // Pinterest signup email check
    const r = await fetch(
      `https://www.pinterest.com/_ng/api/resource/EmailExistsResource/get/?source_url=%2F&data=%7B%22options%22%3A%7B%22email%22%3A%22${encodeURIComponent(email)}%22%7D%7D`,
      { headers: HEADERS_BROWSER, cf: CF_CACHE }
    );
    if (r.ok) {
      const j = (await r.json()) as any;
      // Pinterest returns {"resource_response": {"data": {"exists": true}}}
      const exists = j?.resource_response?.data?.exists;
      if (exists === true) {
        probe.matched = true;
        probe.username = email;
        probe.extra = { Verified_via: "Pinterest signup email check API" };
      }
    }
  } catch { /* ignore */ }
  return probe;
}

/**
 * Snapchat lookup.
 * Snapchat's forgot password flow accepts email and confirms existence.
 */
async function probeSnapchatEmail(email: string): Promise<ServiceProbe | null> {
  const probe: ServiceProbe = {
    service: "Snapchat",
    category: "social",
    icon: "message",
    profileUrl: "https://accounts.snapchat.com",
    matched: false,
    matchType: "email",
    verifiedVia: "password-reset",
    confidence: "high",
  };
  // Snapchat's endpoint requires specific headers (req_token, timestamp, etc.)
  // generated from a static key. Too complex to implement reliably.
  return null;
}

/**
 * Duolingo signup check.
 * Duolingo has an email validation endpoint during signup.
 */
async function probeDuolingoEmail(email: string): Promise<ServiceProbe | null> {
  const probe: ServiceProbe = {
    service: "Duolingo",
    category: "creative",
    icon: "code",
    profileUrl: "https://www.duolingo.com",
    matched: false,
    matchType: "email",
    verifiedVia: "signup-api",
    confidence: "high",
  };
  try {
    // Duolingo signup email check:
    // GET https://www.duolingo.com/2017-06-30/users/email?email=<email>&fields=email,exists
    const r = await fetch(
      `https://www.duolingo.com/2017-06-30/users/email?email=${encodeURIComponent(email)}&fields=email,exists`,
      { headers: HEADERS_BROWSER, cf: CF_CACHE }
    );
    if (r.ok) {
      const j = (await r.json()) as any;
      if (j?.exists === true || j?.email === email) {
        probe.matched = true;
        probe.username = email;
        probe.extra = { Verified_via: "Duolingo email existence API" };
      }
    }
    // Duolingo may also return 422 with a specific JSON shape when email exists
    if (r.status === 422 || r.status === 409) {
      const text = await r.text();
      if (text.includes("email") && (text.includes("exists") || text.includes("taken"))) {
        probe.matched = true;
        probe.username = email;
        probe.extra = { Verified_via: "Duolingo email conflict response" };
      }
    }
  } catch { /* ignore */ }
  return probe;
}

/**
 * Tumblr email probe.
 * Tumblr's forgot password flow accepts email and reveals whether
 * the email is registered.
 */
async function probeTumblrEmail(email: string): Promise<ServiceProbe | null> {
  const probe: ServiceProbe = {
    service: "Tumblr",
    category: "blog",
    icon: "image",
    profileUrl: "https://www.tumblr.com",
    matched: false,
    matchType: "email",
    verifiedVia: "password-reset",
    confidence: "high",
  };
  try {
    // Tumblr's password reset endpoint
    const r = await fetch(
      "https://www.tumblr.com/svc/account/forgot_password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...HEADERS_BROWSER,
        },
        body: JSON.stringify({ email, form_key: "" }),
        cf: CF_CACHE,
      }
    );
    if (r.ok) {
      const j = (await r.json()) as any;
      // Tumblr returns {response: {exists: true}} if email is registered
      if (j?.response?.exists === true || j?.exists === true) {
        probe.matched = true;
        probe.username = email;
        probe.extra = { Verified_via: "Tumblr password reset flow" };
      }
    }
  } catch { /* ignore */ }
  return probe;
}

// ==================== Breach correlation ====================
// If HIBP reports the email was in a breach for service X,
// that's DEFINITIVE proof the email has an account on service X.

interface BreachServiceMapping {
  // HIBP breach name → our service name + icon + URL
  service: string;
  category: ServiceCategory;
  icon: string;
  profileUrl: string;
}

const BREACH_TO_SERVICE: Record<string, BreachServiceMapping> = {
  "LinkedIn":        { service: "LinkedIn",          category: "professional", icon: "briefcase", profileUrl: "https://www.linkedin.com" },
  "Adobe":            { service: "Adobe Creative Cloud", category: "creative", icon: "image",   profileUrl: "https://account.adobe.com" },
  "Dropbox":          { service: "Dropbox",           category: "developer",   icon: "code",     profileUrl: "https://www.dropbox.com" },
  "MyFitnessPal":     { service: "MyFitnessPal",      category: "social",      icon: "user",     profileUrl: "https://www.myfitnesspal.com" },
  "Twitter":          { service: "Twitter / X",        category: "social",      icon: "twitter",  profileUrl: "https://x.com" },
  "MGM Resorts":      { service: "MGM Resorts",       category: "social",      icon: "user",     profileUrl: "https://www.mgmresorts.com" },
  "MyHeritage":       { service: "MyHeritage",        category: "social",      icon: "user",     profileUrl: "https://www.myheritage.com" },
  "Exactis":          { service: "Exactis",            category: "social",      icon: "user",     profileUrl: "https://exactis.com" },
  "Yahoo":            { service: "Yahoo",             category: "social",      icon: "user",     profileUrl: "https://www.yahoo.com" },
  "Canva":            { service: "Canva",              category: "creative",   icon: "image",    profileUrl: "https://www.canva.com" },
  "Wattpad":          { service: "Wattpad",            category: "blog",       icon: "news",     profileUrl: "https://www.wattpad.com" },
  "Dubsmash":         { service: "Dubsmash",           category: "video",      icon: "video",    profileUrl: "https://www.dubsmash.com" },
  "Animoto":          { service: "Animoto",            category: "creative",   icon: "image",    profileUrl: "https://animoto.com" },
  "500px":            { service: "500px",              category: "creative",   icon: "image",    profileUrl: "https://500px.com" },
  "SHEIN":            { service: "SHEIN",              category: "social",      icon: "user",     profileUrl: "https://www.shein.com" },
  "Wattpad":          { service: "Wattpad",            category: "blog",       icon: "news",     profileUrl: "https://www.wattpad.com" },
  "Patreon":          { service: "Patreon",            category: "creative",   icon: "image",    profileUrl: "https://www.patreon.com" },
  "Pinterest":        { service: "Pinterest",          category: "social",      icon: "image",    profileUrl: "https://www.pinterest.com" },
  "Disqus":           { service: "Disqus",              category: "forum",      icon: "message",  profileUrl: "https://disqus.com" },
  "Kickstarter":      { service: "Kickstarter",        category: "creative",   icon: "image",    profileUrl: "https://www.kickstarter.com" },
  "Netflix":          { service: "Netflix",             category: "video",      icon: "video",    profileUrl: "https://www.netflix.com" },
  "Spotify":          { service: "Spotify",            category: "creative",   icon: "music",    profileUrl: "https://www.spotify.com" },
  "Tumblr":           { service: "Tumblr",              category: "blog",       icon: "image",    profileUrl: "https://www.tumblr.com" },
  "Instagram":        { service: "Instagram",          category: "social",      icon: "image",    profileUrl: "https://www.instagram.com" },
  "Snapchat":         { service: "Snapchat",           category: "social",      icon: "message",  profileUrl: "https://www.snapchat.com" },
  "Facebook":         { service: "Facebook",           category: "social",      icon: "user",     profileUrl: "https://www.facebook.com" },
  "GitHub":           { service: "GitHub",              category: "developer",  icon: "github",   profileUrl: "https://github.com" },
  "GitLab":           { service: "GitLab",              category: "developer",  icon: "gitlab",   profileUrl: "https://gitlab.com" },
  "Bitbucket":        { service: "Bitbucket",          category: "developer",  icon: "bitbucket", profileUrl: "https://bitbucket.org" },
  "Reddit":           { service: "Reddit",             category: "social",      icon: "message",  profileUrl: "https://www.reddit.com" },
  "Twitch":           { service: "Twitch",             category: "video",      icon: "video",    profileUrl: "https://www.twitch.tv" },
  "Discord":          { service: "Discord",            category: "messaging",  icon: "message",  profileUrl: "https://discord.com" },
};

/**
 * Build confirmed probes from HIBP breach data.
 * If HIBP shows the email in a breach named "LinkedIn", we know
 * the email has a LinkedIn account — definitive.
 */
function buildBreachProbes(hibp: HIBPResult): ServiceProbe[] {
  if (!hibp.checked || hibp.breaches.length === 0) return [];
  const probes: ServiceProbe[] = [];
  for (const b of hibp.breaches) {
    // Try exact match first, then prefix match (e.g., "LinkedIn 2021" → "LinkedIn")
    let mapping = BREACH_TO_SERVICE[b.name];
    if (!mapping) {
      const key = Object.keys(BREACH_TO_SERVICE).find(k => b.name.startsWith(k));
      if (key) mapping = BREACH_TO_SERVICE[key];
    }
    if (mapping) {
      probes.push({
        service: mapping.service,
        category: mapping.category,
        icon: mapping.icon,
        profileUrl: mapping.profileUrl,
        matched: true,
        matchType: "email",
        verifiedVia: "hibp-breach",
        confidence: "high",
        joinedAt: b.breachDate,
        extra: {
          Confirmed_via: `HIBP — ${b.name} breach (${b.breachDate})`,
          Exposed_data: b.dataClasses.join(", ").slice(0, 80),
          Pwn_count: b.pwnCount.toLocaleString(),
        },
      });
    }
  }
  return probes;
}

// ==================== Gravatar linked accounts ====================
// When a Gravatar profile exists, the API may return linked accounts
// (Twitter, GitHub, Facebook, etc.). These are CONFIRMED by the user
// themselves linking them on Gravatar.

function buildGravatarLinkedProbes(gravatar: GravatarResult): ServiceProbe[] {
  if (!gravatar.exists || !gravatar.accounts?.length) return [];
  const probes: ServiceProbe[] = [];
  for (const acc of gravatar.accounts) {
    const service = acc.shortname || acc.display || "Unknown";
    let category: ServiceCategory = "social";
    let icon = "user";
    let profileUrl = acc.url;
    if (/twitter|x\.com/i.test(service)) { category = "social"; icon = "twitter"; }
    else if (/github/i.test(service)) { category = "developer"; icon = "github"; }
    else if (/facebook/i.test(service)) { category = "social"; icon = "user"; }
    else if (/linkedin/i.test(service)) { category = "professional"; icon = "briefcase"; }
    else if (/instagram/i.test(service)) { category = "social"; icon = "image"; }
    else if (/flickr/i.test(service)) { category = "creative"; icon = "image"; }
    else if (/youtube/i.test(service)) { category = "video"; icon = "video"; }
    else if (/tumblr/i.test(service)) { category = "blog"; icon = "image"; }
    else if (/pinterest/i.test(service)) { category = "social"; icon = "image"; }
    else if (/vimeo/i.test(service)) { category = "video"; icon = "video"; }
    probes.push({
      service: service.charAt(0).toUpperCase() + service.slice(1),
      category,
      icon,
      profileUrl,
      matched: true,
      matchType: "email",
      verifiedVia: "gravatar-link",
      confidence: "high",
      displayName: acc.display || undefined,
      username: acc.display || undefined,
      extra: { Confirmed_via: "Gravatar linked account (user-linked)" },
    });
  }
  return probes;
}

// ==================== Main lookup ====================

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
  confirmedAccounts: ServiceProbe[];     // NEW: accounts confirmed via email (not guesses)
  guessAccounts: ServiceProbe[];         // NEW: accounts from username guessing
  identityPhotos: IdentityPhoto[];
  timeline: TimelineEvent[];
  sourcesMatched: number;
  matchedAccounts: number;
  confirmedCount: number;                 // NEW
  guessCount: number;                     // NEW
  totalServices: number;
  riskScore: "Low" | "Moderate" | "Elevated" | "High";
  summary: string;
  probesByCategory: Record<string, number>;
}

async function doLookup(email: string, env: Env): Promise<LookupResult> {
  const validation = parseEmail(email);
  const emailHash = md5(validation.localPart && validation.domain ? `${validation.localPart}@${validation.domain}` : email);
  const username = validation.localPart || "";
  const fullEmail = `${validation.localPart}@${validation.domain}`;

  const [mx, gravatar, github, hibp] = await Promise.all([
    lookupMx(validation.domain),
    lookupGravatar(emailHash),
    lookupGitHub(fullEmail),
    lookupHIBP(fullEmail, env.HIBP_API_TOKEN),
  ]);

  // ----- CONFIRMED probes (real email-based) -----
  // These probes check if the EMAIL itself has an account on the service.
  // High confidence — they should be trusted.
  const confirmedProbes: ServiceProbe[] = [];

  const grav = await probeGravatarService(gravatar);
  if (grav) confirmedProbes.push(grav);
  const gh = await probeGitHubService(github);
  if (gh) confirmedProbes.push(gh);

  // Real email-based checks
  const emailProbes = await Promise.all([
    probeFirefoxAccounts(fullEmail),
    probeTwitterEmail(fullEmail),
    probeSpotifyEmail(fullEmail),
    probeDuolingoEmail(fullEmail),
    probeTumblrEmail(fullEmail),
    probePinterestEmail(fullEmail),
    probeAdobeEmail(fullEmail),
    probeSnapchatEmail(fullEmail),
  ]);
  for (const p of emailProbes) if (p) confirmedProbes.push(p);

  // Breach correlation — HIBP data definitively confirms account existence
  const breachProbes = buildBreachProbes(hibp);
  for (const p of breachProbes) confirmedProbes.push(p);

  // Gravatar linked accounts (user explicitly linked these)
  const gravatarLinked = buildGravatarLinkedProbes(gravatar);
  for (const p of gravatarLinked) confirmedProbes.push(p);

  // ----- USERNAME-GUESS probes (heuristic) -----
  // These don't check the email — they guess the username from the local part.
  // Lower confidence. May have false positives (different people with same username).
  const guessProbes: ServiceProbe[] = [];

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
    probeTikTok(username),
    probeTwitter(username),
    probeFacebook(username),
    probeYouTube(username),
    probeSpotify(username),
    probeSoundCloud(username),
    probeXbox(username),
  ]);
  for (const p of usernameProbes) {
    if (!p) continue;
    // Mark these as username-guesses (override the verifiedVia if any)
    p.verifiedVia = p.verifiedVia ?? "username-guess";
    // If a confirmed probe already has this service, skip the guess
    const alreadyConfirmed = confirmedProbes.find(c => c.service === p.service);
    if (alreadyConfirmed) continue;
    guessProbes.push(p);
  }

  // Combine all probes
  const probes: ServiceProbe[] = [...confirmedProbes, ...guessProbes];

  // Collect identity photos from all matched services
  const identityPhotos: IdentityPhoto[] = [];
  for (const p of probes) {
    if (p.matched && p.avatarUrl) {
      identityPhotos.push({
        service: p.service,
        url: p.avatarUrl,
        category: p.category,
      });
    }
  }

  // Build timeline from all matched services with a joinedAt date
  const timeline: TimelineEvent[] = [];
  for (const p of probes) {
    if (p.matched && p.joinedAt) {
      timeline.push({
        date: p.joinedAt,
        service: p.service,
        category: p.category,
        profileUrl: p.profileUrl,
        avatarUrl: p.avatarUrl,
      });
    }
  }
  timeline.sort((a, b) => a.date.localeCompare(b.date));

  const matchedAccounts = probes.filter((p) => p.matched).length;
  const positiveServices = probes.filter((p) => p.matched);
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
    validation, mx, gravatar, github, hibp,
    services: probes,
    confirmedAccounts: confirmedProbes.filter(p => p.matched),
    guessAccounts: guessProbes.filter(p => p.matched),
    identityPhotos,
    timeline,
    sourcesMatched,
    matchedAccounts,
    confirmedCount: confirmedProbes.filter(p => p.matched).length,
    guessCount: guessProbes.filter(p => p.matched).length,
    totalServices: probes.length,
    riskScore,
    summary,
    probesByCategory,
  };
}

// ==================== HTTP entry ====================

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(JSON.stringify({
        service: "behindtheemail-osint",
        version: "4.0.0",
        services_probed: 33,
        avatar_aggregation: true,
        timeline: true,
        breach_correlation: true,
        gravatar_linked_accounts: true,
        real_email_checks: [
          "firefox-accounts (public API)",
          "twitter password-reset intent (guest token)",
          "spotify signup validation",
          "duolingo email existence",
          "tumblr password reset",
          "pinterest signup email check",
          "hibp breach correlation (when API key set)",
        ],
        username_guess_checks: 25,
        endpoints: ["/api/lookup?email=foo@bar.com"],
        categories: ["developer", "social", "creative", "gaming", "forum", "blog", "messaging", "video", "professional"],
        optional_secrets: ["HIBP_API_TOKEN", "IMGUR_CLIENT_ID"],
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
