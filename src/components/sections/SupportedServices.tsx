import {
  Linkedin,
  Github,
  Twitter,
  Globe,
  Gamepad2,
  Briefcase,
  MessageSquare,
  Camera,
} from "lucide-react";

const SERVICES = [
  { name: "LinkedIn", desc: "Career history, education, skills", icon: Linkedin },
  { name: "Microsoft Teams", desc: "Org chart, presence, role", icon: MessageSquare },
  { name: "Google", desc: "Profile, photos, reviews", icon: Globe },
  { name: "Google Maps", desc: "Reviews, photos, locations", icon: Camera },
  { name: "GitHub", desc: "Repos, contributions, bio", icon: Github },
  { name: "TikTok", desc: "Profile, content, handle", icon: Camera },
  { name: "Chess.com", desc: "Username, rating, activity", icon: Gamepad2 },
  { name: "Twitter / X", desc: "Handle, bio, activity", icon: Twitter },
];

export default function SupportedServices() {
  return (
    <section id="services" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-primary">
            Supported services
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            One email. A correlated identity across the open web.
          </h2>
          <p className="mt-4 text-text-accent">
            We aggregate signals from the platforms that matter, then cross-reference them so you
            can be confident you&apos;re looking at the same person — not a namesake.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.name}
                className="logo-tile group relative rounded-xl glass p-5 flex flex-col items-start gap-3 lift-on-hover"
                title={s.name}
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                  <Icon className="h-5 w-5 text-text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-text-accent mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-text-accent">
          Plus breach data from LinkedIn, Adobe, Dropbox &amp; more on Pro plans.
        </p>
      </div>
    </section>
  );
}
