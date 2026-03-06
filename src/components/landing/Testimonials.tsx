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
    <section className="bg-[#222] py-14 md:py-20">
      <div className="max-w-[1120px] mx-auto px-5">
        <h2 className="text-2xl md:text-3xl font-bold text-[#e0e0e0] text-center">
          They prepped. They got the job.
        </h2>

        {/* Desktop: 3 cards in a row */}
        <div className="hidden md:grid grid-cols-3 gap-6 mt-10">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </div>

        {/* Mobile: carousel */}
        <div className="md:hidden mt-8">
          <TestimonialCard {...TESTIMONIALS[active]} />
          <div className="flex justify-center gap-2 mt-4">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === active ? "bg-[#4A7AFF]" : "bg-[#444]"
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
    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5">
      <p className="text-sm text-[#bbb] leading-relaxed">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
        <p className="text-sm font-semibold text-[#e0e0e0]">{name}</p>
        <p className="text-xs text-[#4A7AFF]">{role}</p>
      </div>
    </div>
  );
}
