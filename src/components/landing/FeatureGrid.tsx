const FEATURES = [
  {
    emoji: "\uD83C\uDFE2",
    title: "Company-Specific Prep",
    description:
      "Questions and answers tailored to your target company\u2019s culture, product, and interview style.",
  },
  {
    emoji: "\uD83D\uDCDE",
    title: "Mock Cold Call Scripts",
    description:
      "Practice the roleplay round that eliminates 70% of candidates. Walk in with a framework, not a blank page.",
  },
  {
    emoji: "\uD83D\uDD0D",
    title: "Interviewer Research",
    description:
      "Know who\u2019s across the table before you sit down. LinkedIn insights turned into preparation.",
  },
  {
    emoji: "\uD83D\uDDE3\uFE0F",
    title: "Answers That Sound Like You",
    description:
      "AI that writes how you talk, not how robots write. Built from your resume and real experience.",
  },
];

export function FeatureGrid() {
  return (
    <section className="bg-[#F7F5F0] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-5">
        <h2 className="font-serif text-3xl text-[#1A1A1A] text-center mb-12">
          Everything you need to prep
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map(({ emoji, title, description }) => (
            <div
              key={title}
              className="bg-[#FDFCFA] rounded-2xl p-8 border border-[#E8E4DE]
                         hover:shadow-md transition-all duration-300"
            >
              <span className="text-2xl" role="img" aria-hidden="true">
                {emoji}
              </span>
              <h3 className="text-lg font-semibold text-[#1A1A1A] mt-3 font-sans">
                {title}
              </h3>
              <p className="text-sm text-[#6B6560] mt-2 leading-relaxed font-sans">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
