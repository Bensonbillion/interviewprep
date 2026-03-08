"use client";

import { useState } from "react";
import { Phone, Users, Mic, Star } from "lucide-react";

type Track = "sdr" | "ae";

const SDR_ROUNDS = [
  {
    icon: Phone,
    round: "Round 1",
    label: "Recruiter Screen",
    sublabel: "15–30 min",
    testing: "Phone presence, motivation, basic fit. The recruiter is asking: would I want to cold call next to this person?",
    output: ["Tell Me About Yourself narrative", '"Why sales?" + "Why this company?"', "Comp expectations guidance", "Recruiter decoder — what they're really testing", "Cheat sheet"],
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Users,
    round: "Round 2",
    label: "Hiring Manager",
    sublabel: "30–45 min",
    testing: "Grit, coachability, and STAR storytelling. Can you tell a structured story about failure that frames you as the hero who learned — not the victim who quit?",
    output: ["6 personalized STAR answers from your resume", "Career-switcher bridges (if applicable)", "Questions to ask the hiring manager", "Coachability coaching", "Cheat sheet"],
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: Mic,
    round: "Round 3",
    label: "Cold Call / Role Play",
    sublabel: "30–60 min",
    testing: "Structure, discovery instinct, and — the real test — how you respond to coaching mid-call. The second attempt decides the outcome, not the first.",
    output: ["Full cold call script using their actual product + ICP", "5 objection response scripts", "Coachability coaching — the most important prep", "Practice scenarios", "Cheat sheet"],
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: Star,
    round: "Round 4",
    label: "Panel / Final Round",
    sublabel: "30–60 min",
    testing: "Energy, culture fit, and whether you close the interviewer. Great candidates end the final round by asking for the job. Most don't.",
    output: ["5 research talking points showing depth", "Sharp questions for each panelist type", "Executive presence coaching", "Close-the-interviewer script", "Cheat sheet"],
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

const AE_ROUNDS = [
  {
    icon: Phone,
    round: "Round 1",
    label: "Recruiter Screen",
    sublabel: "15–30 min",
    testing: "Do your numbers check out? Quota attainment, deal sizes, sales cycle length. Are you interviewing strategically or just spraying applications?",
    output: ["Metrics-led Tell Me About Yourself", '"Why are you leaving?" answer', "Walk me through your sales process script", "Compensation benchmarking guidance", "Cheat sheet"],
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Users,
    round: "Round 2",
    label: "VP of Sales / Hiring Manager",
    sublabel: "30–45 min",
    testing: "Deal depth: can you dissect a complex deal from discovery through signature? They want multi-threading, procurement navigation, and specific numbers — not a generic process description.",
    output: ["6 STAR answers anchored to your biggest deals", "Deal walkthrough narrative", "Pipeline and forecasting answers", "Questions to ask about quota, territory, and ramp", "Cheat sheet"],
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: Mic,
    round: "Round 3",
    label: "Discovery Demo / Presentation",
    sublabel: "30–60 min",
    testing: "Can you run a real discovery call? Do you ask questions before pitching? Can you handle a skeptical executive who already has a vendor?",
    output: ["Discovery script tailored to company product + buyer personas", "Qualifying question framework", "Demo talk track", "Executive objection responses", "Cheat sheet"],
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: Star,
    round: "Round 4",
    label: "Panel / Cross-Functional / Final",
    sublabel: "30–60 min",
    testing: "Executive presence and stakeholder management. Can this person represent us to a Fortune 500 buyer? Do they have a vision for their first 90 days?",
    output: ["Business case talking points", "First 90 days answer", "Cross-functional collaboration examples", "Close-the-process guidance", "Cheat sheet"],
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

export function RoundsSection() {
  const [track, setTrack] = useState<Track>("sdr");
  const rounds = track === "sdr" ? SDR_ROUNDS : AE_ROUNDS;

  return (
    <div>
      {/* Track toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-10 mx-auto">
        {(["sdr", "ae"] as Track[]).map((t) => (
          <button
            key={t}
            onClick={() => setTrack(t)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              track === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "sdr" ? "SDR / BDR" : "AE / Closing Roles"}
          </button>
        ))}
      </div>

      {/* Round cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {rounds.map((r) => (
          <div
            key={r.label}
            className="border border-gray-100 rounded-2xl p-5 bg-white hover:border-gray-200 transition-colors"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-8 h-8 rounded-lg ${r.bg} flex items-center justify-center shrink-0`}>
                <r.icon className={`w-4 h-4 ${r.color}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {r.round}
                </p>
                <p className="text-sm font-bold text-gray-900">{r.label}</p>
                <p className="text-xs text-gray-400">{r.sublabel}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                What they&apos;re really testing
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">{r.testing}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                You get
              </p>
              <ul className="space-y-1">
                {r.output.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <span className="text-amber-500 mt-0.5">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
