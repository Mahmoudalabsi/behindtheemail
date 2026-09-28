# BehindTheEmail — Clone

A faithful recreation of [behindtheemail.com](https://behindtheemail.com) — a dark-mode SaaS landing page for an OSINT (Open-Source Intelligence) email-intelligence platform. Built with **Next.js 16**, **TypeScript**, **Tailwind CSS 4**, and **shadcn/ui**.

## 🌐 Live demos

| Host | URL | Auto-deploy on push |
|------|-----|---------------------|
| **Cloudflare Pages** (primary) | https://behindtheemail.pages.dev | ✅ via wrangler |
| **GitHub Pages** (mirror) | https://mahmoudalabsi.github.io/behindtheemail/ | ✅ via GitHub Actions |

Both demos hit the same Cloudflare Worker backend at:
https://behindtheemail-osint.mahmoudalabsi0599.workers.dev

## ✨ Features

- **Dark mode first**, mint/teal (`#5EE4D1`) brand accent, **Outfit** typography
- **Live search demo**: paste any email and watch a deterministic OSINT profile generate in real time (7-step scan animation, then a structured report with cross-referenced "sources")
- Sections: Hero · Supported services · Features · How it works · Bulk-search demo · Example report · Use cases · Pricing · FAQ · Contact CTA · Footer
- Fully responsive (mobile + desktop)
- Pricing toggle (monthly ↔ annual)
- Accordion FAQ
- Animated bulk-search queue
- Zero runtime dependencies on the client

## 🚀 Quick start

```bash
# Install deps
bun install

# Dev server
bun run dev        # → http://localhost:3000

# Lint
bun run lint

# Static build (for Cloudflare Pages / any S3-compatible host)
bun run build:static    # → ./out
```

## 📦 Deploy to Cloudflare Pages

```bash
# After building `out/`
npx wrangler pages deploy out \
  --project-name behindtheemail \
  --branch main
```

Or connect the GitHub repo to Cloudflare Pages via the dashboard for auto-deploy on every push.

## 🗂 Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout (Outfit font, dark theme, metadata)
│   ├── page.tsx             # Homepage (assembles all sections)
│   ├── globals.css          # Design tokens, brand colors, glass utilities
│   └── api/route.ts         # Force-static placeholder
├── components/
│   ├── site/                # Header, Footer
│   ├── sections/            # Hero, LiveResults, Stats, SupportedServices,
│   │                        # Features, HowItWorks, BulkSearchDemo,
│   │                        # ExampleProfile, UseCases, Pricing, FAQ, ContactCTA
│   └── ui/                  # shadcn/ui primitives
└── lib/
    ├── profile-generator.ts # Deterministic email → OSINT profile
    ├── db.ts                # Prisma client (unused in static export)
    └── utils.ts              # cn() helper
```

## 🔒 Security notes

- The search demo is **deterministic and offline**: the same email always returns the same profile, and no real lookups are performed against any third-party service. This is a UI demo.
- If you wire up real OSINT APIs, do so via server-side endpoints (Cloudflare Workers, Vercel Functions, etc.) — never expose API keys on the client.

## ⚠️ Disclaimer

This is an educational UI clone. The original site, brand, and design are property of their respective owners. The generated profiles are synthetic and do not represent real people or real data.

## 📝 License

MIT — for educational purposes.
