"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What questions do they ask in a tech sales interview?",
    a: `Tech sales interviews — for SDR, BDR, and AE roles — follow a predictable multi-round structure. Expect a recruiter screen (tell me about yourself, why sales, why this company), a hiring manager round with behavioral STAR questions about challenges, wins, and coachability, a live exercise (cold call role play for SDRs, discovery demo or presentation for AEs), and a final/panel round. The questions are predictable. The structure barely changes between companies. SalesPrep generates personalized answers for every question in every round, calibrated to your specific role level.`,
  },
  {
    q: "How should I prepare for a cold call role play?",
    a: `Research the company's product, ICP, and competitors. Write a script using their actual product — not a generic one. Practice handling common objections: "not interested," "we already have a solution," and "send me an email." The real test isn't the call itself — it's the coachability moment: after your first attempt, the interviewer gives you feedback and asks you to try again. How you respond to that coaching is often the deciding factor. SalesPrep generates a complete cold call script plus specific coaching on how to handle the feedback moment.`,
  },
  {
    q: "How do I prepare for a discovery demo in an AE interview?",
    a: `Study the company's product and buyer personas. Prepare 5–7 open-ended qualifying questions before you pitch anything — the interviewer wants to see that you diagnose before you prescribe. Map the company's value propositions to common pain points for their ICP. SalesPrep generates a complete discovery script using the company's actual product and target buyers, including objection responses for skeptical executive buyers.`,
  },
  {
    q: "How do I answer \"tell me about yourself\" in a sales interview?",
    a: `For SDRs: structure chronologically, highlight 3–4 key beats, bridge to why this role at this company. Keep it 60–90 seconds. For AEs: lead with your numbers (quota attainment, deal sizes, revenue closed), then give 2–3 key career milestones, then bridge to why this specific company and role is your next step. SalesPrep writes this automatically based on your resume and role level — giving you a script you can actually say out loud.`,
  },
  {
    q: "I'm switching careers into tech sales. How do I interview with no sales experience?",
    a: `Reframe your existing experience through a sales lens. Retail? You hit revenue targets and handled objections daily. Hospitality? High-pressure customer-facing work with upselling and relationship management. Recruiting? You cold-called, managed a pipeline, and closed candidates. Teaching? You persuaded, handled tough rooms, and adapted on the fly. SalesPrep's career-switcher bridge automatically translates your background into sales-relevant stories — so you never apologize for your background; you sell it.`,
  },
  {
    q: "How do I talk about quota attainment in an AE interview?",
    a: `Be specific: state your quota, your attainment percentage, and the time period. If you missed quota, own it and explain what you learned — honesty and self-awareness score higher than trying to hide a bad quarter. If you consistently exceeded, contextualize it: "115% attainment in a territory that had been at 80% before I took it over." SalesPrep structures your deal stories and quota narrative from your actual resume data.`,
  },
  {
    q: "What does 'coachability' mean in a sales interview?",
    a: `Coachability is the #1 trait hiring managers evaluate across all tech sales roles — SDR through AE. It means: when someone gives you feedback, can you listen without getting defensive, acknowledge it, and immediately implement it? In role play rounds, interviewers deliberately give coaching between attempts to test this. The second attempt — not the first call — is what gets you the offer. SalesPrep includes specific coaching on exactly what to say and do in the coachability moment.`,
  },
  {
    q: "Is this better than using ChatGPT for interview prep?",
    a: `ChatGPT gives generic advice because it doesn't know your resume, your target company, or what each specific interview round evaluates. SalesPrep researches the company in real-time, cross-references it against your actual experience, and generates answers calibrated to the specific round and role level — SDR vs. AE, recruiter screen vs. VP of Sales interview. Every answer traces back to a real data point from your background. Try the free version and compare the output yourself.`,
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="divide-y divide-gray-100">
      {FAQS.map((faq, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left py-5 flex items-start justify-between gap-4 group"
          >
            <span className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
              {faq.q}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform duration-200 ${
                open === i ? "rotate-180" : ""
              }`}
            />
          </button>
          {open === i && (
            <div className="pb-5">
              <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
