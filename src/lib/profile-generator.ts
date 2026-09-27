/**
 * Deterministic profile generator.
 *
 * Given an email address, produces a stable, realistic-looking OSINT profile.
 * The same email always returns the same profile (so users can re-run a search
 * and see the same results — important for trust in a demo).
 *
 * No real data is fetched. This is a UI demo.
 */

export type ProfileField = { label: string; value: string };
export type ProfileCard = {
  title: string;
  source: string;
  icon: string; // icon key, see iconMap in LiveResults
  fields: ProfileField[];
  matchStrength: "strong" | "moderate" | "weak";
};

export type GeneratedProfile = {
  email: string;
  initials: string;
  displayName: string;
  headline: string;
  city: string;
  region: string;
  country: string;
  sourcesMatched: number;
  riskScore: "Low" | "Moderate" | "Elevated";
  breaches: string[];
  skills: string[];
  interests: string[];
  photoCount: number;
  cards: ProfileCard[];
  verified: boolean;
};

// --- Helpers --------------------------------------------------------------

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: number, offset = 0): T {
  return arr[((seed >>> 0) + offset) % arr.length];
}

function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const out: T[] = [];
  const used = new Set<number>();
  let s = seed >>> 0;
  while (out.length < n && used.size < arr.length) {
    const idx = ((s % arr.length) + arr.length) % arr.length; // always non-negative
    if (!used.has(idx)) {
      used.add(idx);
      out.push(arr[idx]);
    }
    s = Math.imul(s ^ (out.length + 1), 2654435761) >>> 0;
  }
  return out;
}

function titleCase(s: string): string {
  return s.replace(/(^|[-_.\s])([a-z])/g, (_, sep, c) => sep + c.toUpperCase());
}

function extractLocalPart(email: string): string {
  return email.split("@")[0] || email;
}

function extractDomain(email: string): string {
  return email.split("@")[1] || "unknown.com";
}

// --- Data pools -----------------------------------------------------------

const FIRST_NAMES = [
  "Mahmoud", "Sarah", "Daniel", "Aisha", "Lucas", "Yuki", "Omar", "Elena",
  "Kwame", "Priya", "Liam", "Sofia", "Mateo", "Hana", "Noah", "Amira",
  "Ethan", "Layla", "Gabriel", "Maya", "Ibrahim", "Emma", "Ravi", "Chloe",
];

const LAST_NAMES = [
  "Al-Absi", "Chen", "Garcia", "Müller", "Tanaka", "Okonkwo", "Patel", "Rossi",
  "Andersson", "Khan", "Silva", "Nakamura", "Petrov", "Hassan", "Johnson", "Reyes",
  "Walsh", "Kowalski", "Nguyen", "Mendoza", "Adekunle", "Schmidt", "Park", "Ahmed",
];

const JOB_TITLES = [
  "Senior Software Engineer", "Product Manager", "UX Designer", "Data Scientist",
  "DevOps Engineer", "Marketing Lead", "Sales Director", "Founder & CEO",
  "Frontend Engineer", "Backend Engineer", "Cloud Architect", "Security Analyst",
  "Full-Stack Developer", "Tech Lead", "Engineering Manager", "Growth Lead",
];

const COMPANIES = [
  "Stripe", "Figma", "Notion", "Linear", "Vercel", "Anthropic", "OpenAI",
  "Cloudflare", "GitHub", "Microsoft", "Google", "Shopify", "Airbnb",
  "Discord", "Retool", "Supabase", "Ramp", "Plaid",
];

const CITIES: Array<{ city: string; region: string; country: string }> = [
  { city: "San Francisco", region: "California", country: "United States" },
  { city: "Seattle", region: "Washington", country: "United States" },
  { city: "Austin", region: "Texas", country: "United States" },
  { city: "New York", region: "New York", country: "United States" },
  { city: "London", region: "England", country: "United Kingdom" },
  { city: "Berlin", region: "Berlin", country: "Germany" },
  { city: "Amsterdam", region: "North Holland", country: "Netherlands" },
  { city: "Singapore", region: "Singapore", country: "Singapore" },
  { city: "Tokyo", region: "Tokyo", country: "Japan" },
  { city: "Dubai", region: "Dubai", country: "United Arab Emirates" },
  { city: "Toronto", region: "Ontario", country: "Canada" },
  { city: "São Paulo", region: "São Paulo", country: "Brazil" },
];

const SCHOOLS = [
  "MIT", "Stanford University", "Carnegie Mellon University",
  "UC Berkeley", "University of Washington", "ETH Zürich",
  "University of Cambridge", "Imperial College London",
  "University of Tokyo", "IIT Bombay", "University of Toronto",
];

const SKILLS = [
  "TypeScript", "React", "Next.js", "Node.js", "Python", "Go", "Rust",
  "PostgreSQL", "GraphQL", "AWS", "Kubernetes", "Terraform",
  "Figma", "Product Strategy", " Distributed Systems", "Machine Learning",
];

const INTERESTS = [
  "Open-source", "Climbing", "Photography", "Chess", "Coffee roasting",
  "Open-source intelligence", "Indie music", "Distance running",
  "Mechanical keyboards", "Game development", "Synthwave", "Bouldering",
];

const BREACHES = [
  { name: "LinkedIn 2021", exposed: "Email + name + job title" },
  { name: "Adobe 2019", exposed: "Email + password hash" },
  { name: "Dropbox 2016", exposed: "Email + password hash" },
  { name: "Canva 2019", exposed: "Email + name" },
  { name: "MyFitnessPal 2018", exposed: "Email + username" },
  { name: "Twitter 2022", exposed: "Email + phone" },
  { name: "MGM Resorts 2019", exposed: "Email + DOB" },
];

// --- Generator ------------------------------------------------------------

export function generateProfile(email: string): GeneratedProfile {
  const e = (email || "").trim().toLowerCase();
  const seed = hashString(e);
  const localPart = extractLocalPart(e);
  const domain = extractDomain(e);

  // Name: derive from local part if it looks like a name, else pick from pool
  let firstName: string;
  let lastName: string;
  const parts = localPart.split(/[._\-]/).filter(Boolean);
  if (parts.length >= 2 && /^[a-z]{2,}$/i.test(parts[0]) && /^[a-z]{2,}$/i.test(parts[1])) {
    firstName = titleCase(parts[0]);
    lastName = titleCase(parts[1]);
  } else if (/^[a-z]{4,}$/i.test(localPart)) {
    firstName = titleCase(localPart.slice(0, Math.max(3, Math.floor(localPart.length / 2))));
    lastName = pick(LAST_NAMES, seed);
  } else {
    firstName = pick(FIRST_NAMES, seed);
    lastName = pick(LAST_NAMES, seed >>> 3);
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const safeInitial = (s: string) => (s && s[0] ? s[0] : "?");
  const initials = (safeInitial(firstName) + safeInitial(lastName)).toUpperCase();

  const job = pick(JOB_TITLES, seed);
  const company = pick(COMPANIES, seed >>> 5);
  const location = pick(CITIES, seed >>> 7);

  const sourcesMatched = 3 + (seed % 6); // 3–8
  const breachCount = seed % 4; // 0–3
  const breaches = pickN(BREACHES, breachCount, seed >>> 11).map((b) => b.name);
  const riskScore: GeneratedProfile["riskScore"] =
    breachCount === 0 ? "Low" : breachCount <= 2 ? "Moderate" : "Elevated";

  const skills = pickN(SKILLS, 4, seed >>> 13).map((s) => s.trim());
  const interests = pickN(INTERESTS, 3, seed >>> 17);
  const photoCount = 1 + (seed % 6);

  const verified = (seed % 5) !== 0; // 80% verified

  // Build source cards based on which "sources matched"
  const cards: ProfileCard[] = [];

  // LinkedIn card (almost always present)
  if (sourcesMatched >= 1) {
    cards.push({
      title: "Career History",
      source: `linkedin.com/in/${localPart.replace(/[^a-z0-9]/gi, "")}`,
      icon: "briefcase",
      matchStrength: "strong",
      fields: [
        { label: "Current role", value: `${job} at ${company}` },
        { label: "Started", value: `${2018 + (seed % 7)}` },
        { label: "Previous", value: `${pick(JOB_TITLES, seed >>> 19)} at ${pick(COMPANIES, seed >>> 21)}` },
        { label: "Tenure", value: `${3 + (seed % 10)} years in industry` },
      ],
    });
  }

  // Education card
  if (sourcesMatched >= 2) {
    cards.push({
      title: "Education",
      source: `linkedin.com/in/${localPart.replace(/[^a-z0-9]/gi, "")}`,
      icon: "education",
      matchStrength: "moderate",
      fields: [
        { label: "B.Sc.", value: pick(SCHOOLS, seed >>> 19) },
        { label: "Field", value: pick(["Computer Science", "Electrical Engineering", "Mathematics", "Design", "Information Systems"], seed >>> 23) },
        { label: "Graduated", value: `${2014 + (seed % 8)}` },
      ],
    });
  }

  // Location card
  if (sourcesMatched >= 3) {
    cards.push({
      title: "Location",
      source: "google.com/maps",
      icon: "map",
      matchStrength: "moderate",
      fields: [
        { label: "City", value: location.city },
        { label: "Region", value: location.region },
        { label: "Country", value: location.country },
        { label: "Timezone", value: pick(["UTC-8", "UTC-5", "UTC+0", "UTC+1", "UTC+8", "UTC+4"], seed >>> 29) },
      ],
    });
  }

  // GitHub card
  if (sourcesMatched >= 4) {
    cards.push({
      title: "GitHub Activity",
      source: `github.com/${localPart.replace(/[^a-z0-9]/gi, "")}`,
      icon: "github",
      matchStrength: "strong",
      fields: [
        { label: "Username", value: localPart.replace(/[^a-z0-9]/gi, "") },
        { label: "Public repos", value: `${3 + (seed % 40)}` },
        { label: "Joined", value: `${2010 + (seed % 13)}` },
        { label: "Followers", value: `${(seed % 900) + 12}` },
      ],
    });
  }

  // Twitter card
  if (sourcesMatched >= 5) {
    cards.push({
      title: "Public Bio",
      source: `twitter.com/${localPart.replace(/[^a-z0-9]/gi, "")}`,
      icon: "twitter",
      matchStrength: "moderate",
      fields: [
        { label: "Handle", value: `@${localPart.replace(/[^a-z0-9]/gi, "")}` },
        { label: "Verified", value: verified ? "Yes (blue check)" : "No" },
        { label: "Followers", value: `${((seed % 4000) + 80).toLocaleString()}` },
        { label: "Bio", value: `${job} · ${location.city}` },
      ],
    });
  }

  // Skills card
  if (sourcesMatched >= 6) {
    cards.push({
      title: "Skills & Interests",
      source: "linkedin.com · github.com",
      icon: "award",
      matchStrength: "weak",
      fields: skills.map((s) => ({ label: "Skill", value: s })).concat(
        interests.map((i) => ({ label: "Interest", value: i }))
      ).slice(0, 6),
    });
  }

  // Breach card
  cards.push({
    title: "Breach Exposure",
    source: "aggregated breach corpus",
    icon: "shield",
    matchStrength: breachCount > 0 ? "moderate" : "weak",
    fields: breaches.length > 0
      ? breaches.map((b) => ({ label: b, value: "Email exposed" }))
      : [{ label: "Status", value: "No public breaches found" }],
  });

  return {
    email: e,
    initials: initials.toUpperCase(),
    displayName: fullName,
    headline: `${job} at ${company} · Based in ${location.city}, ${location.region}`,
    city: location.city,
    region: location.region,
    country: location.country,
    sourcesMatched,
    riskScore,
    breaches,
    skills,
    interests,
    photoCount,
    cards,
    verified,
  };
}
