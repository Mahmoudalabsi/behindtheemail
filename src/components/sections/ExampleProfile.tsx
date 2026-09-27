import {
  Briefcase,
  GraduationCap,
  MapPin,
  Linkedin,
  Github,
  ShieldAlert,
  Camera,
  Globe,
  Award,
  Languages,
} from "lucide-react";

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 text-text-accent/70 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-text-accent/70">{label}</p>
        <p className="text-xs text-text-primary truncate">{value}</p>
      </div>
    </div>
  );
}

function Card({
  title,
  source,
  icon: Icon,
  children,
}: {
  title: string;
  source: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl glass p-4 lift-on-hover">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-xs font-semibold">{title}</p>
            <p className="text-[10px] text-text-accent/70">{source}</p>
          </div>
        </div>
        <span className="text-[10px] text-brand-primary font-mono">matched</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default function ExampleProfile() {
  return (
    <section id="example" className="py-20 sm:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-primary/[0.04] to-transparent pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-primary">
            Example report
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            What you actually get back.
          </h2>
          <p className="mt-4 text-text-accent">
            A real, structured identity profile — grouped by source, cross-referenced, every
            field auditable. This is the report for{" "}
            <span className="font-mono text-brand-primary">satyan@microsoft.com</span>.
          </p>
        </div>

        {/* Identity banner */}
        <div className="mt-12 rounded-2xl glass-strong p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-brand-primary/30 to-brand-primary/5 ring-1 ring-brand-primary/30 flex items-center justify-center text-2xl font-bold text-brand-primary">
                SN
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[9px] text-[#081016] font-bold ring-2 ring-[#0B1117]">
                ✓
              </span>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-xl sm:text-2xl font-bold">Satya Nadella</h3>
                <span className="font-mono text-xs text-text-accent">satyan@microsoft.com</span>
              </div>
              <p className="mt-1 text-sm text-text-accent">
                Chairman &amp; CEO at Microsoft · Based in Bellevue, WA
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full bg-brand-primary/10 ring-1 ring-brand-primary/30 px-2.5 py-0.5 text-brand-primary">
                  8 sources matched
                </span>
                <span className="rounded-full bg-white/5 ring-1 ring-white/10 px-2.5 py-0.5 text-text-accent">
                  Verified identity
                </span>
                <span className="rounded-full bg-white/5 ring-1 ring-white/10 px-2.5 py-0.5 text-text-accent">
                  No false-positive risk
                </span>
              </div>
            </div>

            <button className="self-start sm:self-center px-3 py-1.5 text-xs rounded-md btn-brand">
              Export PDF
            </button>
          </div>
        </div>

        {/* Source cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card title="Career History" source="linkedin.com/in/satyanadella" icon={Briefcase}>
            <Field icon={Briefcase} label="Current" value="Chairman & CEO, Microsoft" />
            <Field icon={Briefcase} label="Since" value="Feb 2014" />
            <Field icon={Briefcase} label="Previous" value="EVP Cloud & Enterprise" />
            <Field icon={Award} label="Tenure" value="32 years at Microsoft" />
          </Card>

          <Card title="Education" source="linkedin.com/in/satyanadella" icon={GraduationCap}>
            <Field icon={GraduationCap} label="B.Sc." value="Electrical Engineering, Manipal" />
            <Field icon={GraduationCap} label="M.S." value="Computer Science, UW-Milwaukee" />
            <Field icon={GraduationCap} label="MBA" value="University of Chicago Booth" />
          </Card>

          <Card title="Location" source="google.com/maps" icon={MapPin}>
            <Field icon={MapPin} label="City" value="Bellevue, Washington" />
            <Field icon={MapPin} label="Country" value="United States" />
            <Field icon={MapPin} label="Origin" value="Hyderabad, India" />
            <Field icon={Languages} label="Languages" value="English, Telugu, Hindi" />
          </Card>

          <Card title="GitHub Activity" source="github.com/satyanadella" icon={Github}>
            <Field icon={Github} label="Username" value="satyanadella" />
            <Field icon={Github} label="Public repos" value="3" />
            <Field icon={Github} label="Joined" value="2011" />
            <Field icon={Github} label="Followers" value="14.2k" />
          </Card>

          <Card title="Public Bio" source="twitter.com/satyanadella" icon={Globe}>
            <Field icon={Globe} label="Handle" value="@satyanadella" />
            <Field icon={Globe} label="Verified" value="Yes (blue check)" />
            <Field icon={Globe} label="Followers" value="3.4M" />
            <Field icon={Globe} label="Bio" value="Chairman & CEO, Microsoft" />
          </Card>

          <Card title="Breach Exposure" source="haveibeenpwned-style aggregator" icon={ShieldAlert}>
            <Field icon={ShieldAlert} label="LinkedIn 2021" value="Email + name exposed" />
            <Field icon={ShieldAlert} label="Adobe 2019" value="Email only" />
            <Field icon={ShieldAlert} label="Dropbox 2016" value="Email + password hash" />
            <Field icon={ShieldAlert} label="Risk score" value="Moderate · 3 incidents" />
          </Card>
        </div>

        {/* Photo strip */}
        <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.02] ring-1 ring-white/10 flex items-center justify-center"
            >
              <Camera className="h-4 w-4 text-text-accent/40" />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-text-accent/70 text-center">
          6 public photos cross-referenced from Google Maps &amp; LinkedIn
        </p>
      </div>
    </section>
  );
}
