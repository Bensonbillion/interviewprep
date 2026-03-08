"use client";

import { useState } from "react";
import Link from "next/link";
import { HOME_FAQ_DATA } from "@/lib/landing/faq-data";

const FAQS = HOME_FAQ_DATA.map((f) => ({ q: f.question, a: f.answer }));

export function HomeFAQ() {
  return (
    <section className="bg-[#FDFCFA] py-16 md:py-24">
      <div className="max-w-2xl mx-auto px-5">
        <h2 className="font-serif text-3xl text-[#1A1A1A] text-center">
          Questions? We&apos;ve got answers.
        </h2>

        <div className="mt-10 divide-y divide-[#E8E4DE]">
          {FAQS.map(({ q, a }) => (
            <FAQItem key={q} question={q} answer={a} />
          ))}
        </div>

        <p className="text-center text-sm text-[#9C9590] mt-8 font-sans">
          More questions?{" "}
          <Link
            href="/blog"
            className="text-[#4A7AFF] hover:underline"
          >
            Read our blog
          </Link>{" "}
          or{" "}
          <a
            href="mailto:support@salesprep.ai"
            className="text-[#4A7AFF] hover:underline"
          >
            email us
          </a>
          .
        </p>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left min-h-[52px]"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-[#1A1A1A] pr-4 font-sans">
          {question}
        </span>
        <span
          className={`text-[#9C9590] transition-transform duration-200 shrink-0 text-lg ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      {open && (
        <div className="pb-5">
          <p className="text-sm text-[#6B6560] leading-relaxed font-sans">{answer}</p>
        </div>
      )}
    </div>
  );
}
