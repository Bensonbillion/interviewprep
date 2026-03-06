"use client";

import { useState } from "react";
import Link from "next/link";
import { HOME_FAQ_DATA } from "@/lib/landing/faq-data";

const FAQS = HOME_FAQ_DATA.map((f) => ({ q: f.question, a: f.answer }));

export function HomeFAQ() {
  return (
    <section className="bg-[#222] py-14 md:py-20">
      <div className="max-w-2xl mx-auto px-5">
        <h2 className="text-2xl md:text-3xl font-bold text-[#e0e0e0] text-center">
          Frequently asked questions
        </h2>

        <div className="mt-8 space-y-2">
          {FAQS.map(({ q, a }) => (
            <FAQItem key={q} question={q} answer={a} />
          ))}
        </div>

        <p className="text-center text-sm text-[#777] mt-8">
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
    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left min-h-[52px]"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-[#e0e0e0] pr-4">
          {question}
        </span>
        <span
          className={`text-[#666] transition-transform duration-200 shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        >
          &#9662;
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-[#999] leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

