const STATS = [
  { value: "50+", label: "Companies" },
  { value: "6", label: "Interview stages" },
  { value: "150+", label: "Questions covered" },
  { value: "Free", label: "To start" },
];

export function StatsGrid() {
  return (
    <section className="bg-[#F7F5F0] py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-serif text-3xl md:text-4xl text-[#E8735A]">
                {value}
              </p>
              <p className="text-sm text-[#9C9590] mt-1 uppercase tracking-wider font-sans">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
