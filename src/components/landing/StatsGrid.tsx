const STATS = [
  { value: "50+", label: "companies" },
  { value: "6", label: "interview stages" },
  { value: "150+", label: "questions covered" },
  { value: "Free", label: "to start" },
];

export function StatsGrid() {
  return (
    <section className="bg-[#1a1a1a] py-12 md:py-16">
      <div className="max-w-[1120px] mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(({ value, label }) => (
            <div
              key={label}
              className="bg-[#222] rounded-xl border border-[#2a2a2a] p-5 text-center"
            >
              <p className="text-2xl md:text-3xl font-bold text-[#4A7AFF]">
                {value}
              </p>
              <p className="text-xs text-[#999] mt-1 uppercase tracking-wide">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
