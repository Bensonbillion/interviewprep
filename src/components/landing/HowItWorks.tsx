const STEPS = [
  {
    num: "01",
    title: "Tell us about your interview",
    description: "Company, role, and stage. That\u2019s it.",
  },
  {
    num: "02",
    title: "Get your AI prep kit",
    description:
      "Personalized answers, company research, and interviewer intel.",
  },
  {
    num: "03",
    title: "Practice and nail it",
    description: "Review, refine, and walk in ready.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[#FDFCFA] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-5">
        <h2 className="font-serif text-3xl text-[#1A1A1A] text-center">
          From anxious to confident
        </h2>
        <p className="text-[#6B6560] text-center mt-3 font-sans">
          Three steps. Two minutes. One prep kit.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 mt-14">
          {STEPS.map(({ num, title, description }) => (
            <div key={num} className="text-center">
              <p className="font-serif text-6xl text-[#E8E4DE] leading-none mb-4">
                {num}
              </p>
              <h3 className="text-base font-semibold text-[#1A1A1A] font-sans">
                {title}
              </h3>
              <p className="text-sm text-[#6B6560] mt-2 leading-relaxed max-w-xs mx-auto font-sans">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
