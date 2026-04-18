"use client";

import { useState } from "react";
import Link from "next/link";
import type { PrepSession } from "@/types";
import { UserSearch, AlertTriangle, MessageCircleQuestion, Clock, Mic, Shield, ChevronRight } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SessionInterviewer {
  name: string;
  title: string | null;
  profile_data: Record<string, unknown> | null;
}

interface WeakSpot {
  area: string;
  severity: string;
  what_they_said?: string;
  why_its_vulnerable?: string;
  likely_question: string;
  model_answer: string;
  who_asks?: string;
}

interface PanelQuestion {
  question: string;
  asked_by?: string;
  what_theyre_testing?: string;
  model_answer: string;
  trap_to_avoid?: string;
  coachability_note?: string;
}

interface TimingSlide {
  slide: string;
  time_range: string;
  key_move: string;
  coaching_note?: string;
  risk?: string;
  tip?: string;
}

interface RoleplayLine {
  speaker: string;
  text: string;
  coaching?: string;
}

interface CheatPoint {
  point: string;
  detail: string;
  who_its_for?: string;
}

interface DefensePrepPageProps {
  session: PrepSession;
  sessionId: string;
  interviewers: SessionInterviewer[];
  kit: {
    weakness_audit: WeakSpot[];
    hard_questions: PanelQuestion[];
    timing_guide: TimingSlide[];
    roleplay_script: { lines?: RoleplayLine[]; golden_rule?: string };
    cheat_sheet: { points?: CheatPoint[]; permission_to_stop?: string };
  };
}

// ─── Tab config ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "people", label: "Who you\u2019re facing", icon: UserSearch },
  { id: "weak", label: "Weak spots", icon: AlertTriangle },
  { id: "questions", label: "Hard questions", icon: MessageCircleQuestion },
  { id: "timing", label: "Presentation", icon: Clock },
  { id: "roleplay", label: "Roleplay", icon: Mic },
  { id: "cheat", label: "Cheat sheet", icon: Shield },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function DefensePrepPage({
  session,
  sessionId,
  interviewers,
  kit,
}: DefensePrepPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("people");

  const stageName = session.stageName ?? "Panel Interview";
  const companyName = session.companyName;

  return (
    <div className="min-h-screen bg-[#F7F6F3] dark:bg-[var(--bg-page)]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#F7F6F3] dark:bg-[var(--bg-page)] border-b border-[#E8E4DF] dark:border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center gap-1.5 text-xs text-[#9B8E82] mb-1">
            <Link href="/dashboard" className="hover:text-[#5C5347] transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#5C5347] font-medium">{companyName}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#1C1713] dark:text-white">
              {companyName} — {stageName}
            </h1>
            <Link
              href={`/prep/${sessionId}/live`}
              className="px-4 py-1.5 bg-[#E8735A] text-white text-[13px] font-medium rounded-[10px] hover:bg-[#C85A42] transition-colors no-underline flex-shrink-0"
            >
              Open live mode
            </Link>
          </div>
          <p className="text-[11px] text-[#C5BDB5] mt-1">
            Live mode: phone-sized cheat sheet for the actual interview. Tap to advance.
          </p>
        </div>

        {/* Tab bar */}
        <div className="max-w-3xl mx-auto px-4 sm:px-8 flex gap-0.5 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-[#E8735A] text-[#E8735A]"
                    : "border-transparent text-[#9B8E82] hover:text-[#5C5347]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 space-y-4 pb-24">
        {activeTab === "people" && (
          <PeopleTab interviewers={interviewers} />
        )}
        {activeTab === "weak" && (
          <WeakSpotsTab spots={kit.weakness_audit} />
        )}
        {activeTab === "questions" && (
          <QuestionsTab questions={kit.hard_questions} />
        )}
        {activeTab === "timing" && (
          <TimingTab slides={kit.timing_guide} />
        )}
        {activeTab === "roleplay" && (
          <RoleplayTab script={kit.roleplay_script} />
        )}
        {activeTab === "cheat" && (
          <CheatSheetTab cheatSheet={kit.cheat_sheet} />
        )}
      </div>

      {/* Sticky live mode bar */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "var(--bg-card, #fff)",
          borderTop: "0.5px solid var(--color-border-tertiary, #E8E4DF)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 30,
        }}
      >
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary, #1C1713)" }}>
            Ready to practice?
          </p>
          <p style={{ fontSize: 11, color: "var(--text-secondary, #5C5347)" }}>
            Open on your phone during the interview
          </p>
        </div>
        <a
          href={`/prep/${sessionId}/live`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "10px 22px",
            background: "#E8735A",
            color: "#fff",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          Open live mode →
        </a>
      </div>
    </div>
  );
}

// ─── Tab: People ─────────────────────────────────────────────────────────────

function PeopleTab({ interviewers }: { interviewers: SessionInterviewer[] }) {
  if (interviewers.length === 0) {
    return <EmptyState message="No interviewers researched yet." />;
  }

  return (
    <div className="space-y-3">
      {interviewers.map((iv) => {
        const pd = iv.profile_data ?? {};
        const initials = iv.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        const priorities = Array.isArray(pd.likely_priorities)
          ? (pd.likely_priorities as string[]).slice(0, 3)
          : [];

        return (
          <div
            key={iv.name}
            style={{
              display: "flex",
              gap: 14,
              padding: 16,
              background: "var(--bg-card, #fff)",
              border: "1px solid var(--color-border, #E8E4DF)",
              borderRadius: 12,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#EBF5FF",
                color: "#3B82F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500, fontSize: 14, color: "#1C1713", marginBottom: 2 }}>
                {iv.name}
              </p>
              <p style={{ fontSize: 12, color: "#9B8E82", marginBottom: 8 }}>
                {iv.title ?? ""}
              </p>

              {/* Priority tags */}
              {priorities.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {priorities.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 100,
                        background: "#F7F6F3",
                        border: "0.5px solid #E8E4DF",
                        fontSize: 10,
                        color: "#5C5347",
                        marginRight: 4,
                        marginBottom: 4,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {typeof pd.how_to_talk_to_them === "string" && (
                <p style={{ fontSize: 13, color: "#1C1713", lineHeight: 1.6, marginBottom: 6 }}>
                  {pd.how_to_talk_to_them}
                </p>
              )}

              {typeof pd.watch_outs === "string" && (
                <p style={{ fontSize: 12, color: "#D97706", marginTop: 8 }}>
                  Watch: {pd.watch_outs}
                </p>
              )}

              {typeof pd.great_question_to_ask_them === "string" && (
                <p style={{ fontSize: 12, color: "#9B8E82", marginTop: 6, fontStyle: "italic" }}>
                  Great question to ask them: &ldquo;{pd.great_question_to_ask_them}&rdquo;
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Weak Spots ─────────────────────────────────────────────────────────

function WeakSpotsTab({ spots }: { spots: WeakSpot[] }) {
  if (spots.length === 0) return <EmptyState message="No weak spots identified." />;

  return (
    <div className="space-y-4">
      {spots.map((ws, i) => (
        <Card key={i}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
              ws.severity === "high"
                ? "bg-red-50 text-red-600 border border-red-200"
                : "bg-amber-50 text-amber-600 border border-amber-200"
            }`}>
              {ws.severity}
            </span>
            <span className="text-[12px] text-[#9B8E82]">{ws.area}</span>
            {ws.who_asks && (
              <span className="text-[11px] text-[#C5BDB5] ml-auto">Likely from: {ws.who_asks}</span>
            )}
          </div>
          {ws.likely_question && (
            <p className="text-[14px] font-medium text-[#1C1713] dark:text-white mb-2 italic">
              &ldquo;{ws.likely_question}&rdquo;
            </p>
          )}
          {ws.model_answer && (
            <Section label="Your answer" content={ws.model_answer} accent />
          )}
          {ws.why_its_vulnerable && (
            <Section label="Why it\u2019s vulnerable" content={ws.why_its_vulnerable} warn />
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Tab: Questions ──────────────────────────────────────────────────────────

function QuestionsTab({ questions }: { questions: PanelQuestion[] }) {
  if (questions.length === 0) return <EmptyState message="No questions generated." />;

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <Card key={i}>
          <div className="flex items-center gap-2 mb-2">
            {q.asked_by && (
              <span className="text-[10px] bg-[#F5F2ED] text-[#5C5347] px-2 py-0.5 rounded-full">
                {q.asked_by}
              </span>
            )}
          </div>
          <p className="text-[14px] font-medium text-[#1C1713] dark:text-white mb-2 italic">
            &ldquo;{q.question}&rdquo;
          </p>
          {q.what_theyre_testing && (
            <p className="text-[11px] text-[#9B8E82] mb-3">Testing: {q.what_theyre_testing}</p>
          )}
          <Section label="Your answer" content={q.model_answer} accent />
          {q.trap_to_avoid && (
            <Section label="Trap to avoid" content={q.trap_to_avoid} warn />
          )}
          {q.coachability_note && (
            <Section label="If they push back" content={q.coachability_note} />
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Tab: Timing ─────────────────────────────────────────────────────────────

function TimingTab({ slides }: { slides: TimingSlide[] }) {
  if (slides.length === 0) return <EmptyState message="No timing guide generated." />;

  return (
    <div className="space-y-3">
      {slides.map((s, i) => (
        <Card key={i}>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-[13px] font-mono text-[#E8735A] font-medium">{s.time_range}</span>
            <span className="text-[14px] font-semibold text-[#1C1713] dark:text-white">{s.slide}</span>
          </div>
          <p className="text-[13px] text-[#3D3530] dark:text-white/80 mb-2">{s.key_move}</p>
          {s.coaching_note && (
            <Section label="Coaching" content={s.coaching_note} />
          )}
          {s.risk && (
            <Section label="Risk" content={s.risk} warn />
          )}
          {s.tip && (
            <p className="text-[11px] text-[#9B8E82] mt-2">Tip: {s.tip}</p>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Tab: Roleplay ───────────────────────────────────────────────────────────

function RoleplayTab({ script }: { script: { lines?: RoleplayLine[]; golden_rule?: string } }) {
  const lines = script.lines ?? [];
  if (lines.length === 0) return <EmptyState message="No roleplay script generated." />;

  return (
    <div>
      {script.golden_rule && (
        <div className="bg-[#E8735A]/5 border border-[#E8735A]/20 rounded-xl p-4 mb-4">
          <p className="text-[11px] font-bold uppercase text-[#E8735A] tracking-wider mb-1">Golden Rule</p>
          <p className="text-[13px] text-[#3D3530] dark:text-white/80">{script.golden_rule}</p>
        </div>
      )}
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`rounded-xl p-3.5 ${
              line.speaker === "you"
                ? "bg-[#E8735A]/5 border border-[#E8735A]/15 ml-4"
                : "bg-[#F5F2ED] dark:bg-white/5 mr-4"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-[#9B8E82]">
              {line.speaker === "you" ? "You" : "Them"}
            </p>
            <p className="text-[13px] text-[#1C1713] dark:text-white leading-relaxed">{line.text}</p>
            {line.coaching && (
              <p className="text-[11px] text-[#E8735A] mt-1.5 italic">{line.coaching}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Cheat Sheet ────────────────────────────────────────────────────────

function CheatSheetTab({ cheatSheet }: { cheatSheet: { points?: CheatPoint[]; permission_to_stop?: string } }) {
  const points = cheatSheet.points ?? [];

  return (
    <div className="space-y-3">
      {points.map((p, i) => (
        <Card key={i}>
          <div className="flex items-start gap-3">
            <span className="text-[18px] font-semibold text-[#E8735A] flex-shrink-0 w-6">{i + 1}</span>
            <div>
              <p className="text-[14px] font-semibold text-[#1C1713] dark:text-white">{p.point}</p>
              <p className="text-[13px] text-[#5C5347] dark:text-white/70 mt-1 leading-relaxed">{p.detail}</p>
              {p.who_its_for && (
                <p className="text-[11px] text-[#C5BDB5] mt-1">For: {p.who_its_for}</p>
              )}
            </div>
          </div>
        </Card>
      ))}

      {cheatSheet.permission_to_stop && (
        <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-xl p-5 mt-6 text-center">
          <p className="text-[14px] text-[#15803d] dark:text-[#4ade80] leading-relaxed">
            {cheatSheet.permission_to_stop}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Shared components ───────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[var(--bg-card)] border border-[#E8E4DF] dark:border-white/5 rounded-xl p-4 sm:p-5 shadow-sm">
      {children}
    </div>
  );
}

function Section({ label, content, accent, warn }: { label: string; content: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="mt-2.5">
      <p
        className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
          warn ? "text-amber-600" : accent ? "text-[#E8735A]" : "text-[#9B8E82]"
        }`}
      >
        {label}
      </p>
      <p className="text-[13px] text-[#3D3530] dark:text-white/80 leading-relaxed">{content}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-[13px] text-[#C5BDB5]">{message}</div>
  );
}
