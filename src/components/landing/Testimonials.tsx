"use client";

import { useState } from "react";

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "SDR at Datadog",
    quote:
      "I found SalesPrep at 11pm the night before my final interview. The cold call script alone was worth it \u2014 I nailed the roleplay and got the offer.",
  },
  {
    name: "James K.",
    role: "BDR at HubSpot",
    quote:
      "I was a teacher switching to tech sales. SalesPrep helped me frame my classroom experience as sales skills. My interviewer said my answers were the most structured she\u2019d heard.",
  },
  {
    name: "Priya R.",
    role: "AE at Snowflake",
    quote:
      "The company research saved me hours. I walked in knowing their ICP, top competitors, and recent product launches. The hiring manager noticed.",
  },
];

export function Testimonials() {
  const [active, setActive] = useState(0);

  return (
    <section className="bg-[#FDFCFA] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-5">
        <h2 className="font-serif text-3xl text-[#1A1A1A] text-center">
          They prepped. They got hired.
        </h2>

        {/* Desktop: 3 cards in a row */}
        <div className="hidden md:grid grid-cols-3 gap-6 mt-12">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </div>

        {/* Mobile: carousel with snap scroll */}
        <div className="md:hidden mt-8">
          <TestimonialCard {...TESTIMONIALS[active]} />
          <div className="flex justify-center gap-2 mt-4">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === active ? "bg-[#E8735A]" : "bg-[#E8E4DE]"
                }`}
                aria-label={`Show testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({
  name,
  role,
  quote,
}: {
  name: string;
  role: string;
  quote: string;
}) {
  return (
    <div className="bg-[#F7F5F0] rounded-2xl p-8 relative">
      {/* Decorative quote mark */}
      <span className="font-serif text-5xl text-[#E8E4DE] absolute top-4 left-6 leading-none select-none">
        &ldquo;
      </span>
      <p className="text-sm text-[#1A1A1A] leading-relaxed italic font-sans pt-8">
        {quote}
      </p>
      <div className="mt-5">
        <p className="text-sm font-semibold text-[#1A1A1A] font-sans">{name}</p>
        <p className="text-xs text-[#9C9590] font-sans">{role}</p>
      </div>
    </div>
  );
}
