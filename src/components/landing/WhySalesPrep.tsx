"use client";
import { useEffect, useRef } from "react";
import { ScrollReveal } from "./ScrollReveal";

const CARDS = [
  {
    title: "It knows the matchup.",
    body: "SalesPrep researches how your current company and your target company actually compete, and builds that read into the answers where it belongs.",
  },
  {
    title: "It interviews you first.",
    body: "The sharpest material is a specific story only you hold. SalesPrep asks for it before it writes a word — instead of guessing, or handing you a template with blanks.",
  },
  {
    title: "It prepares the whole interview.",
    body: "Not one answer — every round. Your opener, your behavioral stories, objection handling, the questions you ask them, a cheat sheet for the morning of. One coherent kit.",
  },
];

export function WhySalesPrep() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll("[data-card]").forEach((item, i) => {
            setTimeout(() => item.classList.add("in"), i * 120);
          });
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="px-6 sm:px-14 py-20 bg-[#1C1713] border-y border-[#2C2825]">
      <ScrollReveal>
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#E8735A] mb-[14px]">
          Why SalesPrep
        </p>
      </ScrollReveal>
      <ScrollReveal delay={1}>
        <h2 className="font-[family-name:var(--font-serif)] text-[36px] sm:text-[46px] leading-[1.08] tracking-[-0.8px] text-[#F7F6F3] max-w-[640px] mb-3">
          A chatbot can rewrite
          <br />
          your resume.
        </h2>
      </ScrollReveal>
      <ScrollReveal delay={2}>
        <p className="text-[16px] leading-relaxed font-light mb-12 text-[rgba(247,246,243,0.55)] max-w-[560px]">
          It can&rsquo;t tell you why the company you&rsquo;re interviewing at
          beats the company you&rsquo;re leaving — because it doesn&rsquo;t
          know to ask, and you&rsquo;d have to already know the answer to tell it.
        </p>
      </ScrollReveal>
      <div
        ref={gridRef}
        className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-[1200px]"
      >
        {CARDS.map((card, i) => (
          <div
            key={i}
            data-card=""
            className="ins-item bg-[#201E1A] border border-[#3A3530] rounded-[14px] p-6 hover:border-[#5A5550] transition-colors duration-300"
          >
            <h3 className="text-[18px] font-[family-name:var(--font-serif)] text-[#F7F6F3] mb-3 leading-snug">
              {card.title}
            </h3>
            <p className="text-[13px] text-[rgba(247,246,243,0.55)] leading-[1.65]">
              {card.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
