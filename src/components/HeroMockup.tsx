"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

const EXAMPLES = {
  sdr: {
    label: "Marcus J. — SDR at Gong",
    badge: "Career Switcher → Tech Sales",
    type: "Tell Me About Yourself",
    duration: "~68 sec spoken",
    beats: ["Hospitality → sales instinct", "Discovery skills", "Bridge to Gong"],
    content: `"I spent three years managing front-of-house at a high-volume restaurant group — ran a 15-person team, hit revenue targets every quarter, and built my career on reading people and handling pressure in real time. What I realized is that every skill I developed in hospitality — handling objections, creating urgency, turning a hard no into a yes — is exactly what SDRs do on cold calls.

When I decided to pivot into tech sales, I went all in: completed a sales development bootcamp, read Fanatical Prospecting twice, and ran mock cold calls until the framework felt second nature. I chose Gong specifically because I've been watching how revenue intelligence is reshaping how sales teams coach and ramp new reps. I want to be on the inside of that shift — and I'm ready to earn it."`,
    source: "Built from: hospitality manager role · bootcamp cert · 3 top bullets",
  },
  ae: {
    label: "Rachel S. — Enterprise AE at Snowflake",
    badge: "Mid-Market SaaS → Enterprise",
    type: "Tell Me About Yourself",
    duration: "~72 sec spoken",
    beats: ["$4.2M closed, 115%+ quota", "Multi-threaded deals", "Bridge to Snowflake"],
    content: `"Over the past four years, I've closed $4.2M in new business across two mid-market SaaS companies, finishing above 115% of quota in three of four years. What I've learned is that the difference between a good quarter and a great one isn't pipeline volume — it's deal quality.

I got serious about multi-threading early: mapping every deal across three to five stakeholders and making sure procurement, IT, and the economic buyer were aligned before legal ever touched a contract. The reason I'm excited about Snowflake is the enterprise motion. The deals I've been most proud of — selling transformational infrastructure, not point solutions — are exactly the type of deals Snowflake runs at scale. I've built the foundation to operate at that level."`,
    source: "Built from: $4.2M ARR metric · 6 top bullets · multi-threading experience",
  },
} as const;

type Role = keyof typeof EXAMPLES;

export function HeroMockup() {
  const [active, setActive] = useState<Role>("sdr");
  const ex = EXAMPLES[active];

  return (
    <div>
      {/* Persona toggle */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {(["sdr", "ae"] as Role[]).map((r) => (
          <button
            key={r}
            onClick={() => setActive(r)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              active === r
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {r === "sdr" ? "SDR Example" : "AE Example"}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Card header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              {ex.badge}
            </span>
            <p className="text-sm font-semibold text-gray-900 mt-2">{ex.type}</p>
            <p className="text-xs text-gray-500 mt-0.5">{ex.label}</p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 border border-gray-100">
            {ex.duration}
          </span>
        </div>

        {/* Answer text */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-6 italic">
            {ex.content}
          </p>
        </div>

        {/* Key beats */}
        <div className="px-5 pb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Key beats
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ex.beats.map((b) => (
              <span
                key={b}
                className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md border border-gray-100"
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Source */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-400">{ex.source}</p>
        </div>
      </div>
    </div>
  );
}
