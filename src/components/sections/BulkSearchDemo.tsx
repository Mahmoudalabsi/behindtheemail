"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Upload } from "lucide-react";

type Row = {
  email: string;
  name: string;
  status: "queued" | "searching" | "done";
  matched: number;
};

const SEED: Row[] = [
  { email: "satya.nadella@microsoft.com", name: "Satya Nadella", status: "done", matched: 8 },
  { email: "sjobs@apple.com", name: "Steve Jobs", status: "done", matched: 6 },
  { email: "gtanaka@github.com", name: "Grace Tanaka", status: "searching", matched: 0 },
  { email: "p.müller@dropbox.com", name: "Peter Müller", status: "searching", matched: 0 },
  { email: "laurag@linkedin.com", name: "Laura Gomez", status: "queued", matched: 0 },
  { email: "d.chen@adobe.com", name: "Daniel Chen", status: "queued", matched: 0 },
  { email: "k.owusu@googlemail.com", name: "Kwame Owusu", status: "queued", matched: 0 },
];

export default function BulkSearchDemo() {
  const [rows, setRows] = useState<Row[]>(SEED);

  useEffect(() => {
    const t = setInterval(() => {
      setRows((prev) => {
        const next = [...prev];
        const idxSearching = next.findIndex((r) => r.status === "searching");
        if (idxSearching >= 0) {
          next[idxSearching] = {
            ...next[idxSearching],
            status: "done",
            matched: Math.floor(Math.random() * 5) + 4,
          };
          const idxQueued = next.findIndex((r) => r.status === "queued");
          if (idxQueued >= 0) {
            next[idxQueued] = { ...next[idxQueued], status: "searching" };
          }
        } else {
          // restart cycle
          return SEED.map((r) => ({ ...r }));
        }
        return next;
      });
    }, 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left copy */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-primary">
              Bulk search
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
              Process hundreds of emails. Watch every match land in real time.
            </h2>
            <p className="mt-4 text-text-accent leading-relaxed">
              Upload a CSV or paste a list. Our engine runs each email through every supported
              source in parallel, then surfaces a live queue so your team can see progress — and
              jump on the most promising leads the instant they resolve.
            </p>

            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Parallel multi-source correlation",
                "Live progress + per-row status",
                "One-click CSV / XLSX export",
                "Re-run history & saved queues",
              ].map((b) => (
                <li key={b} className="flex items-center gap-2 text-text-accent">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/15">
                    <Check className="h-3 w-3 text-brand-primary" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <button className="mt-7 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg glass text-sm hover:border-brand-primary/40 transition-colors">
              <Upload className="h-4 w-4 text-brand-primary" />
              Upload CSV
            </button>
          </div>

          {/* Right queue */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl glass-strong overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-primary animate-search-pulse" />
                  <span className="text-xs font-mono text-text-accent">
                    bulk_queue · 7 items
                  </span>
                </div>
                <span className="text-[11px] text-text-accent/70">
                  {rows.filter((r) => r.status === "done").length}/7 resolved
                </span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/[0.06]">
                {rows.map((row, i) => (
                  <div
                    key={row.email}
                    className="flex items-center gap-4 px-5 py-3.5 animate-slide-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="text-[11px] font-mono text-text-accent/60 w-6">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{row.email}</p>
                      <p className="text-xs text-text-accent truncate">
                        {row.name}
                      </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 w-28 justify-end">
                      {row.status === "done" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-brand-primary">
                          <Check className="h-3.5 w-3.5" /> {row.matched} sources
                        </span>
                      ) : row.status === "searching" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-text-accent">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-primary" />
                          Searching…
                        </span>
                      ) : (
                        <span className="text-xs text-text-accent/60">Queued</span>
                      )}
                    </div>

                    {/* Mobile status dot */}
                    <span className="sm:hidden">
                      {row.status === "done" && <Check className="h-4 w-4 text-brand-primary" />}
                      {row.status === "searching" && (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
                      )}
                      {row.status === "queued" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-text-accent/40 inline-block" />
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-white/[0.02]">
                <span className="text-[11px] text-text-accent/70">
                  Avg. resolution: 38s · Last run 2 min ago
                </span>
                <button className="text-xs text-brand-primary hover:underline">
                  Export CSV →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
