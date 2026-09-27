const STATS = [
  { value: "10+", label: "Public sources correlated" },
  { value: "<60s", label: "Avg. time to a full profile" },
  { value: "0", label: "False-positive matches returned" },
  { value: "4.9/5", label: "Avg. customer rating" },
];

export default function Stats() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl glass p-6 text-center lift-on-hover"
            >
              <p className="text-3xl sm:text-4xl font-bold text-brand-gradient">{s.value}</p>
              <p className="mt-2 text-xs text-text-accent leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
