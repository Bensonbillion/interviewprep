"use client";

import { useState } from "react";
import { FileText, Zap } from "lucide-react";

type Tab = "tmay" | "star" | "roleplay" | "cheatsheet";
type Persona = "sdr" | "ae";

const TABS: { id: Tab; label: string }[] = [
  { id: "tmay", label: "Tell Me About Yourself" },
  { id: "star", label: "Behavioral / STAR" },
  { id: "roleplay", label: "Role Play Script" },
  { id: "cheatsheet", label: "Cheat Sheet" },
];

const CONTENT: Record<Tab, Record<Persona, { title: string; meta: string; label: string; text: string; source: string }>> = {
  tmay: {
    sdr: {
      title: "Marcus J. → SDR at Gong",
      meta: "Career Switcher · Recruiter Screen · ~68 sec spoken",
      label: "60-second narrative",
      text: `"I spent three years managing front-of-house at a high-volume restaurant group — ran a 15-person team, hit revenue targets every quarter, and built my career on reading people and handling pressure in real time. What I realized is that every skill I developed in hospitality — handling objections from difficult guests, creating urgency, and turning a hard no into a yes — is exactly what SDRs do on cold calls.

When I decided to pivot into tech sales, I went all in: completed a sales development bootcamp, read Fanatical Prospecting twice, and ran mock cold calls until the framework felt second nature. I chose Gong specifically because I've been watching how revenue intelligence is reshaping how sales teams coach and ramp new reps. I want to be on the inside of that shift — and I'm ready to earn it."`,
      source: "Built from: hospitality manager role · bootcamp cert · 3 high-relevance bullets",
    },
    ae: {
      title: "Rachel S. → Enterprise AE at Snowflake",
      meta: "Experienced Sales · VP of Sales Round · ~72 sec spoken",
      label: "Metrics-led narrative",
      text: `"Over the past four years, I've closed $4.2M in new business across two mid-market SaaS companies, finishing above 115% of quota in three of four years. What I've learned is that the difference between a good quarter and a great one isn't pipeline volume — it's deal quality.

I got serious about multi-threading early: mapping every deal across three to five stakeholders and making sure procurement, IT, and the economic buyer were aligned before legal ever touched a contract. The reason I'm excited about Snowflake is the enterprise motion. The deals I've been most proud of — selling transformational infrastructure, not point solutions — are exactly the type of deals Snowflake runs at scale. I've built the foundation to operate at that level, and this is where I want to go do it."`,
      source: "Built from: $4.2M ARR metric · 6 top bullets · multi-threading methodology",
    },
  },
  star: {
    sdr: {
      title: "\"Tell me about a time you exceeded a goal.\"",
      meta: "Marcus J. · Hiring Manager Round · STAR Format · ~75 sec",
      label: "Behavioral answer",
      text: `"In my second year managing front-of-house, we had a company goal to increase private events revenue by 20% in Q4. My manager set the target, but I decided I wasn't going to wait for it to happen — I was going to go get it.

I built a prospecting system: I started reaching out directly to local corporate event coordinators on LinkedIn, offered to do walk-through tours during slow afternoons, and put together a one-page pitch deck of our event packages and pricing.

By the end of Q4, we'd booked 14 private events — 11 of which came from my direct outreach — and exceeded the revenue goal by 34%. My GM called it out in the team meeting and made it our standard practice going forward.

What I took away from that experience: the people who hit goals aren't waiting for leads. They're going out and creating them. Which is exactly why I want to be in outbound sales."`,
      source: "Built from: Hospitality Manager role · Q4 revenue milestone bullet",
    },
    ae: {
      title: "\"Tell me about a deal you lost. What did you learn?\"",
      meta: "Rachel S. · VP of Sales Round · Deal Story · ~85 sec",
      label: "Deal story + self-awareness",
      text: `"In Q3 of last year, I was eight months into a $210K deal with a mid-size fintech company — deep into procurement, champion fully bought in, and I thought we were two weeks from signature. Then they went with a competitor.

When I debriefed with my champion afterward, she told me what happened: their CTO had raised concerns about implementation complexity in the final stages, and I hadn't built enough of a relationship with the technical stakeholders to address it before it became a decision-level issue. I'd over-indexed on the economic buyer and hadn't threaded the deal properly.

I changed how I run every deal after that: I now map technical champions within the first four weeks, regardless of deal stage. In the two quarters since, I've closed three enterprise deals where technical blockers came up early — and I handled them before they ever reached the buying committee.

Losing that deal cost me that quarter. The lesson from it is still paying dividends."`,
      source: "Built from: enterprise deal history · pipeline methodology bullets · AE stage decoder",
    },
  },
  roleplay: {
    sdr: {
      title: "Cold Call Script — SDR at Gong",
      meta: "Marcus J. · Role Play Round · Gong's actual product + ICP",
      label: "Full cold call script",
      text: `OPENER
"Hey [Name], this is Marcus from Gong — I'll be super brief. We help VP-level sales leaders at B2B SaaS companies coach their reps 3x faster using AI call recording. Quick question — is getting your new SDRs to quota faster something that's on your plate right now?"

QUALIFYING QUESTIONS (ask before pitching)
→ "How are your new reps currently getting up to speed on what a great discovery call sounds like?"
→ "Out of curiosity, how long does it typically take a new SDR to hit quota at your company?"

VALUE PROP (only after they answer)
"Based on what you just said — [repeat their pain] — that's exactly why teams like Outreach, Sendoso, and Drift use Gong. Their new reps can review their top performers' actual calls on day one. Ramp time drops by an average of 30%."

OBJECTION: "Not interested / We're all set"
→ "Totally understand — most VP of Sales say that until they see the ramp-time data. What's the biggest challenge with getting your SDRs to quota faster right now?"

CLOSE
"Based on what you've shared, I think there's a fit worth a proper conversation. Would you be open to a 20-minute call with one of our AEs next week?"

COACHABILITY COACHING
When they stop you and say "good first try — try asking a discovery question before your pitch": smile, say "I appreciate that feedback," then on attempt two, stop before the value prop and ask "Before I go further — how are your reps currently getting ramped today?"`,
      source: "Built from: Gong product research · ICP (B2B SaaS, VP Sales) · cold call playbook",
    },
    ae: {
      title: "Discovery Demo Opening — Enterprise AE at Snowflake",
      meta: "Rachel S. · Role Play Round · Snowflake enterprise motion",
      label: "Discovery demo script",
      text: `OPENING
"Before I show you anything, I want to make sure we spend our time on what actually matters to you. I've done some research on [Company], but I'd rather hear directly from you — so give me 10 minutes of your thoughts before I touch a single slide."

DISCOVERY QUESTIONS (earn the right to pitch)
→ "Walk me through how your data teams are currently accessing and analyzing data across different business units — what does that actually look like today?"
→ "When a business stakeholder needs a data pull for a quarterly business review, what's the process? How long does that take end-to-end?"
→ "Out of curiosity, what's the most painful data bottleneck you hit in the last quarter?"

PIVOT TO DEMO (after understanding pain)
"Based on what you just described — [repeat their specific pain back] — I want to show you exactly how that maps to what our customers in [their industry] use Snowflake to solve. The work you just described that takes three days? Let me show you what it looks like when it happens in three hours."

OBJECTION: "We already have Redshift"
→ "That's great context — actually, most of our best Snowflake accounts came from Redshift. They didn't replace it overnight. Can I ask what prompted this conversation? Usually when teams are already in Redshift and exploring Snowflake, there's a specific ceiling they've hit."`,
      source: "Built from: Snowflake product research · enterprise buyer personas · discovery framework",
    },
  },
  cheatsheet: {
    sdr: {
      title: "Cheat Sheet — Recruiter Screen · Gong SDR",
      meta: "Marcus J. · Review 30 minutes before your call",
      label: "One-page cheat sheet",
      text: `COMPANY ONE-LINER
Gong records, transcribes, and analyzes sales calls using AI — helping revenue teams coach reps faster and forecast more accurately.

WHAT THEY'RE TESTING TODAY
Phone presence, genuine motivation, and whether you understand what an SDR actually does. They want to hear energy, not a rehearsed script. The recruiter is asking: "Would I want to cold call next to this person?"

YOUR STRONGEST STORY
Managed 15-person team, exceeded private events revenue goal by 34% through self-directed LinkedIn prospecting — shows outbound instinct before you've held the title.

KEY COMPANY FACTS TO REFERENCE
→ Used by teams like Outreach, Sendoso, LinkedIn Sales Solutions
→ Gong Engage launched in 2024 — their new sales engagement product
→ Revenue intelligence = they analyze what top performers say and replicate it

CRITICAL TIP FOR THIS ROUND
When they ask "Why Gong?" don't say "I love the product." Say: "I've been following how Gong is used specifically for ramping new SDRs — your coaching features are exactly what I'd want available to me on day one. I want to learn from a company that's built the playbook for what I'm trying to become."`,
      source: "Built from: Gong company research · Marcus's resume · recruiter stage decoder",
    },
    ae: {
      title: "Cheat Sheet — VP Sales Round · Snowflake Enterprise AE",
      meta: "Rachel S. · Review 30 minutes before your interview",
      label: "One-page cheat sheet",
      text: `COMPANY ONE-LINER
Snowflake is the Data Cloud — a cloud-native data platform that allows any organization to store, query, and share data across clouds and business units at enterprise scale without data movement.

WHAT THEY'RE TESTING TODAY
Deal depth: can you dissect a complex deal from discovery through signature? They want specific multi-threading examples, negotiation stories, and clear metrics. Generic process answers lose to experienced candidates.

YOUR STRONGEST STORY
The $210K fintech deal you lost — use it to demonstrate self-awareness and coachability. This is more impressive than a win story because it shows you diagnose your own weaknesses and change.

KEY COMPANY FACTS TO REFERENCE
→ ~$3.4B ARR, operating in 40+ countries, public since 2020
→ Core differentiator: "data sharing without data movement"
→ Big push into AI/ML workloads on the Data Cloud in 2024–2025
→ Tri-cloud strategy: runs natively on AWS, Azure, and GCP

CRITICAL TIP FOR THIS ROUND
Name your sales methodology explicitly — "I run a modified MEDDIC approach" — then immediately give a specific deal example. VP of Sales rounds reward candidates who can speak the language of enterprise sales process, not just close stories.`,
      source: "Built from: Snowflake research · Rachel's resume · VP Sales stage decoder",
    },
  },
};

export function ProductShowcase() {
  const [tab, setTab] = useState<Tab>("tmay");
  const [persona, setPersona] = useState<Persona>("sdr");
  const content = CONTENT[tab][persona];

  return (
    <div>
      {/* Tab nav */}
      <div className="flex gap-0 border-b border-gray-200 mb-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content card */}
      <div className="bg-white border border-gray-200 border-t-0 rounded-b-2xl overflow-hidden">
        {/* Persona toggle + meta */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-900">{content.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{content.meta}</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
            {(["sdr", "ae"] as Persona[]).map((p) => (
              <button
                key={p}
                onClick={() => setPersona(p)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  persona === p
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p === "sdr" ? "SDR/BDR" : "AE"}
              </button>
            ))}
          </div>
        </div>

        {/* Answer label */}
        <div className="px-5 pt-4 pb-1">
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
            {content.label}
          </span>
        </div>

        {/* Answer text */}
        <div className="px-5 py-3">
          <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
            {content.text}
          </pre>
        </div>

        {/* Source footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-1.5">
          <FileText className="w-3 h-3 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-400">{content.source}</p>
        </div>
      </div>
    </div>
  );
}
