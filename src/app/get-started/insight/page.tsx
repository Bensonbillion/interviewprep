"use client";

/**
 * Insight Interview — the candidate's STAR-truth capture surface.
 *
 * What this page does:
 *   1. Loads interrogation_lines for the session via GET /api/insight-interview.
 *      Empty lines (switcher / no-brief sessions) → auto-skip to /prep.
 *   2. Renders every line at once as a list of cards. The candidate
 *      answers in any order.
 *   3. On answer completion (blur or explicit "Done with this one"),
 *      calls POST /api/insight-interview/answer. Substantive → quiet
 *      confirmed state. Thin → one inline follow-up offer with the
 *      generated drill question. The drill is dismissible and answerable.
 *      Answering it → POST /api/insight-interview/drill.
 *   4. A submit (or skip) → POST /api/insight-interview/complete. Then
 *      a fire-and-forget /api/generate-answer call kicks the priority
 *      answer pre-gen (moved-not-dropped reframed step 6 — no answer is
 *      generated until the engine has the candidate's lived truth, or
 *      the candidate has explicitly skipped past the chance to give it).
 *   5. router.push(`/prep/${sessionId}`).
 *
 * Resumable: existing captured_insights are pre-filled on mount.
 * Per-card evaluation is non-blocking — answering card 3 doesn't wait
 * for card 2's evaluation to complete.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoIcon } from "@/components/Logo";
import { trackEvent } from "@/lib/tracking/events";
import type {
  AnswerEvaluation,
  CapturedInsight,
  InsightInterviewStatus,
  InterrogationLine,
  InterrogationSource,
  PositioningType,
  PrepSession,
} from "@/types";

// Per-stage priority answer — moved here from GenerationScreen, fired
// from /complete so no answer ever generates before the candidate has
// fed (or skipped) the engine.
const STAGE_PRIORITY: Record<string, string> = {
  recruiter: "tell_me_about_yourself",
  hiring_manager: "resume_walkthrough",
  role_play: "role_play_script",
  panel: "cheat_sheet",
  take_home: "cold_email",
};

interface CardState {
  raw_answer: string;
  drilled_answer: string | null;
  follow_up_question: string | null;
  follow_up_dismissed: boolean;
  follow_up_answer: string;
  quality: "unanswered" | "thin" | "substantive";
  star_coverage: AnswerEvaluation["star_coverage"] | null;
  evaluating: boolean;
  drilling: boolean;
  /** True when raw_answer differs from what's been evaluated server-side. */
  dirty: boolean;
}

/**
 * Render a string with `*word*` markers as italic emphasis. Used in the
 * fallback interrogation set so we can italicize specific words (e.g. the
 * "you" in "what specifically did *you* do") without storing JSX or
 * pulling in a markdown renderer. Plain text otherwise — no other
 * formatting is interpreted.
 */
function renderEmphasis(text: string): ReactNode {
  if (!text.includes("*")) return text;
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i} className="italic font-medium">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function emptyCardState(): CardState {
  return {
    raw_answer: "",
    drilled_answer: null,
    follow_up_question: null,
    follow_up_dismissed: false,
    follow_up_answer: "",
    quality: "unanswered",
    star_coverage: null,
    evaluating: false,
    drilling: false,
    dirty: false,
  };
}

function cardStateFromCaptured(c: CapturedInsight): CardState {
  return {
    raw_answer: c.raw_answer ?? "",
    drilled_answer: c.drilled_answer,
    follow_up_question: c.follow_up_question,
    follow_up_dismissed: c.follow_up_dismissed,
    follow_up_answer: "",
    quality: c.answer_quality,
    star_coverage: c.star_coverage,
    evaluating: false,
    drilling: false,
    dirty: false,
  };
}

function InsightPageBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [interrogationLines, setInterrogationLines] = useState<InterrogationLine[]>([]);
  const [cards, setCards] = useState<CardState[]>([]);
  const [status, setStatus] = useState<InsightInterviewStatus>("pending");
  const [positioningType, setPositioningType] = useState<PositioningType | null>(null);
  // 045: source drives honest UI copy. 'fallback' shows the "we couldn't
  // fully research this matchup" header; 'competitive' and 'switcher'
  // show the standard header. Default 'competitive' is a safe pre-045
  // value for any legacy session.
  const [interrogationSource, setInterrogationSource] =
    useState<InterrogationSource>("competitive");
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // ── Auth + initial load ────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) {
      router.replace("/get-started");
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/get-started");
        return;
      }
      setAuthChecked(true);
      await loadInterview();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, router]);

  const loadInterview = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/insight-interview?session_id=${sessionId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load interview (${res.status})`);
      }
      const data = await res.json() as {
        interrogation_lines: InterrogationLine[];
        captured_insights: CapturedInsight[];
        insight_interview_status: InsightInterviewStatus;
        positioning_type: PositioningType | null;
        interrogation_source?: InterrogationSource;
      };
      setInterrogationLines(data.interrogation_lines);
      setStatus(data.insight_interview_status);
      setPositioningType(data.positioning_type);
      setInterrogationSource(data.interrogation_source ?? "competitive");

      // Build per-card state, restoring captured answers by index.
      const byIndex = new Map<number, CapturedInsight>();
      for (const c of data.captured_insights) byIndex.set(c.interrogation_line_index, c);
      const initial = data.interrogation_lines.map((_, i) => {
        const captured = byIndex.get(i);
        return captured ? cardStateFromCaptured(captured) : emptyCardState();
      });
      setCards(initial);

      // 045: this branch USED TO be the silent-skip every switcher
      // session and every degraded competitive session fell into. After
      // 045 the engine writes a fallback set for those paths, so this
      // is now an exceptional state. We keep the auto-skip as a safety
      // net but emit telemetry so the failure is no longer invisible.
      if (data.interrogation_lines.length === 0 && data.insight_interview_status !== "completed") {
        trackEvent({
          name: "insight_interview_empty",
          properties: {
            session_id: sessionId,
            positioning_type: data.positioning_type ?? null,
            interrogation_source: data.interrogation_source ?? null,
          },
        });
        await finishInterview(sessionId, true);
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load interview");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── Per-card: evaluate the current answer ──────────────────────────
  const submitAnswer = useCallback(async (index: number) => {
    if (!sessionId) return;
    const card = cards[index];
    if (!card || !card.dirty || card.evaluating) return;
    if (card.raw_answer.trim().length === 0) return;

    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, evaluating: true } : c)));
    try {
      const res = await fetch("/api/insight-interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          interrogation_line_index: index,
          raw_answer: card.raw_answer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Evaluation failed");
      const evalResult = data.evaluation as AnswerEvaluation;
      setCards((prev) => prev.map((c, i) => i === index ? {
        ...c,
        evaluating: false,
        dirty: false,
        quality: evalResult.quality,
        star_coverage: evalResult.star_coverage,
        follow_up_question: evalResult.follow_up_question,
        follow_up_dismissed: false,
        follow_up_answer: "",
        drilled_answer: null,
      } : c));
    } catch (e) {
      setCards((prev) => prev.map((c, i) => i === index ? { ...c, evaluating: false } : c));
      setError(e instanceof Error ? e.message : "Evaluation failed");
    }
  }, [cards, sessionId]);

  // ── Per-card: submit the inline drill ──────────────────────────────
  const submitDrill = useCallback(async (index: number) => {
    if (!sessionId) return;
    const card = cards[index];
    if (!card || card.follow_up_answer.trim().length === 0 || card.drilling) return;

    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, drilling: true } : c)));
    try {
      const res = await fetch("/api/insight-interview/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          interrogation_line_index: index,
          follow_up_answer: card.follow_up_answer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Drill save failed");
      const captured = data.captured_insight as CapturedInsight;
      setCards((prev) => prev.map((c, i) => i === index ? {
        ...c,
        drilling: false,
        drilled_answer: captured.drilled_answer,
        quality: "substantive",
        follow_up_dismissed: false,
        follow_up_answer: "",
      } : c));
    } catch (e) {
      setCards((prev) => prev.map((c, i) => i === index ? { ...c, drilling: false } : c));
      setError(e instanceof Error ? e.message : "Drill save failed");
    }
  }, [cards, sessionId]);

  const dismissDrill = useCallback((index: number) => {
    setCards((prev) => prev.map((c, i) => i === index ? {
      ...c,
      follow_up_dismissed: true,
      follow_up_answer: "",
    } : c));
  }, []);

  // ── Submit / skip → mark complete + kick priority pre-gen + go to prep ──
  const finishInterview = useCallback(async (sid: string, skipped: boolean) => {
    setFinishing(true);
    try {
      await fetch("/api/insight-interview/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, skipped }),
      });

      // Priority answer pre-gen — fired here, not in GenerationScreen,
      // so no answer is generated before the Insight Interview has had
      // its turn. Fire-and-forget: the prep page reads generated_answers
      // when it loads.
      const sessionRaw = typeof window !== "undefined"
        ? sessionStorage.getItem(`session-${sid}`)
        : null;
      if (sessionRaw) {
        try {
          const session = JSON.parse(sessionRaw) as PrepSession;
          const priorityType = STAGE_PRIORITY[session.stage];
          if (priorityType && session.answerSlots?.some((s) => s.type === priorityType)) {
            // Don't await — let it run in the background.
            void fetch("/api/generate-answer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: sid,
                answerType: priorityType,
                session,
              }),
            });
          }
        } catch {
          // Bad sessionStorage shape — prep page will generate on demand.
        }
      }
    } catch {
      // Even if /complete failed, navigate so the user isn't stuck.
    }
    router.push(`/prep/${sid}`);
  }, [router]);

  // ── Derived: how many cards are interview-ready ────────────────────
  const readyCount = useMemo(
    () => cards.filter((c) => c.quality === "substantive").length,
    [cards]
  );
  const attemptedCount = useMemo(
    () => cards.filter((c) => c.raw_answer.trim().length > 0).length,
    [cards]
  );
  const allAttempted = cards.length > 0 && attemptedCount === cards.length;

  // ── Render ─────────────────────────────────────────────────────────
  if (!authChecked || !sessionId || loading) {
    return (
      <main className="min-h-screen bg-[#F0F7FF] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A7AFF]" />
      </main>
    );
  }

  // Empty-lines auto-skip in-flight. After 045 this should be rare —
  // engine paths always populate either dynamic or fallback lines. When
  // it does fire, the narrated copy matches what's actually running
  // during the wait: buildNarrativeSpine is a Sonnet call that weaves
  // captured answers (or, in this skip case, the resume) into one
  // coherent story.
  if (interrogationLines.length === 0) {
    return (
      <main className="min-h-screen bg-[#F0F7FF] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A7AFF] mx-auto mb-3" />
          <p className="text-sm text-[#64748B]">Weaving your answers into one story…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F0F7FF] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <LogoIcon size="md" theme="light" />
          </div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Tell us what only you know</h1>
          {interrogationSource === "fallback" ? (
            <p className="text-base text-[#475569] mt-2 max-w-xl mx-auto">
              We couldn&rsquo;t fully research this matchup — but these are the questions that matter most anyway.
              Your answer is what makes the prep kit yours, not a chatbot&rsquo;s.
            </p>
          ) : (
            <p className="text-base text-[#475569] mt-2 max-w-xl mx-auto">
              We pulled the {interrogationLines.length} questions an interviewer at this company is most likely to test you on.
              Your answer is what makes the prep kit yours — not a chatbot&rsquo;s.
              {positioningType ? <> Positioning: <span className="font-semibold">{positioningType.replace(/_/g, " ")}</span>.</> : null}
            </p>
          )}
        </div>

        {/* Progress signal */}
        <div className="mb-6 bg-white rounded-xl border border-[#DBEAFE] px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-[#475569]">
            <span className="font-semibold text-[#0F172A]">{readyCount} of {cards.length}</span> answers interview-ready
          </p>
          <p className="text-xs text-[#94A3B8]">{attemptedCount}/{cards.length} attempted</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start justify-between">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => setError(null)} className="ml-3"><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        {/* Cards */}
        <div className="space-y-4">
          {interrogationLines.map((line, i) => {
            const card = cards[i] ?? emptyCardState();
            return (
              <InterrogationCard
                key={`${i}-${line.question.slice(0, 30)}`}
                index={i}
                line={line}
                card={card}
                onAnswerChange={(val) => setCards((prev) => prev.map((c, idx) => idx === i ? { ...c, raw_answer: val, dirty: true } : c))}
                onSubmitAnswer={() => submitAnswer(i)}
                onFollowUpChange={(val) => setCards((prev) => prev.map((c, idx) => idx === i ? { ...c, follow_up_answer: val } : c))}
                onSubmitDrill={() => submitDrill(i)}
                onDismissDrill={() => dismissDrill(i)}
              />
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => finishInterview(sessionId, true)}
            disabled={finishing}
            className="text-sm text-[#64748B] hover:text-[#475569] underline disabled:opacity-50"
          >
            Skip the rest — build my kit from what I&rsquo;ve given you
          </button>
          <button
            type="button"
            onClick={() => finishInterview(sessionId, false)}
            disabled={finishing || !allAttempted}
            className="bg-[#4A7AFF] hover:bg-[#3B66E8] disabled:bg-[#94A3B8] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {finishing ? "Weaving your answers into one story…" : "Submit and build my kit"}
          </button>
        </div>
        {!allAttempted && !finishing && (
          <p className="text-xs text-[#94A3B8] text-center mt-3">
            Submit unlocks once every question has at least an attempted answer.
          </p>
        )}

        {/* Tracked status (debug-ish) */}
        {status === "completed" || status === "skipped" ? (
          <p className="text-xs text-[#94A3B8] text-center mt-6">
            This interview was marked <span className="font-semibold">{status}</span> previously — your saved answers are restored above.
          </p>
        ) : null}
      </div>
    </main>
  );
}

interface InterrogationCardProps {
  index: number;
  line: InterrogationLine;
  card: CardState;
  onAnswerChange: (v: string) => void;
  onSubmitAnswer: () => void;
  onFollowUpChange: (v: string) => void;
  onSubmitDrill: () => void;
  onDismissDrill: () => void;
}

function InterrogationCard({
  index, line, card,
  onAnswerChange, onSubmitAnswer,
  onFollowUpChange, onSubmitDrill, onDismissDrill,
}: InterrogationCardProps) {
  // Blur evaluates if the answer is dirty + non-empty. Explicit "Done"
  // button does the same for keyboard-driven users.
  const onBlur = () => {
    if (card.dirty && card.raw_answer.trim().length > 0) onSubmitAnswer();
  };

  // Use a ref so card-level focus tracking works for the textarea.
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isReady = card.quality === "substantive";
  const isThin = card.quality === "thin" && !card.follow_up_dismissed && card.follow_up_question;

  return (
    <div className={`bg-white rounded-2xl border p-5 transition-colors ${
      isReady ? "border-[#10B981]/50 bg-[#F0FDF4]" : "border-[#DBEAFE]"
    }`}>
      {/* Question */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${
          isReady ? "bg-[#10B981] text-white" : "bg-[#EFF6FF] text-[#1D4ED8]"
        }`}>
          {isReady ? <Check className="w-4 h-4" /> : index + 1}
        </div>
        <div className="flex-1">
          <p className="text-base font-semibold text-[#0F172A] leading-snug">{renderEmphasis(line.question)}</p>
          <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
            <span className="font-medium text-[#475569]">Why it matters:</span> {renderEmphasis(line.why_it_matters)}
          </p>
        </div>
      </div>

      {/* Answer textarea */}
      <textarea
        ref={textareaRef}
        value={card.raw_answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Walk us through it — the specific deal, what was said, what you did, how it ended."
        rows={4}
        className="w-full bg-[#F8FAFF] border border-[#E2E8F8] rounded-xl px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#4A7AFF] resize-y"
        disabled={card.evaluating}
      />

      {/* Eval status row */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {card.evaluating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-[#4A7AFF]" />
              <span className="text-[#64748B]">Evaluating…</span>
            </>
          ) : isReady ? (
            <span className="text-[#059669] font-medium">Looks interview-ready.</span>
          ) : card.quality === "thin" ? (
            <span className="text-[#B45309] font-medium">Close — one quick follow-up below.</span>
          ) : card.raw_answer.trim().length > 0 && card.dirty ? (
            <span className="text-[#94A3B8]">Unsaved changes.</span>
          ) : null}
        </div>
        {card.dirty && card.raw_answer.trim().length > 0 && !card.evaluating ? (
          <button
            type="button"
            onClick={onSubmitAnswer}
            className="text-xs font-medium text-[#4A7AFF] hover:text-[#3B66E8]"
          >
            Done with this one
          </button>
        ) : null}
      </div>

      {/* Inline follow-up offer */}
      {isThin && card.follow_up_question ? (
        <div className="mt-4 bg-[#FFFBEB] border border-[#FCD34D]/40 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-sm text-[#92400E] leading-snug">
              <span className="font-semibold">One sharper:</span> {card.follow_up_question}
            </p>
            <button
              type="button"
              onClick={onDismissDrill}
              className="text-[#B45309] hover:text-[#78350F]"
              aria-label="Dismiss follow-up"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={card.follow_up_answer}
            onChange={(e) => onFollowUpChange(e.target.value)}
            placeholder="Add the specific you skipped…"
            rows={3}
            className="w-full bg-white border border-[#E2E8F8] rounded-lg px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#F59E0B] resize-y"
            disabled={card.drilling}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onDismissDrill}
              disabled={card.drilling}
              className="text-xs text-[#B45309] hover:text-[#78350F] px-3 py-1.5"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={onSubmitDrill}
              disabled={card.drilling || card.follow_up_answer.trim().length === 0}
              className="bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#FCD34D] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              {card.drilling ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Save the sharper version
            </button>
          </div>
        </div>
      ) : null}

      {/* Drilled-answer summary (post-drill) */}
      {card.drilled_answer ? (
        <div className="mt-3 text-xs text-[#059669] flex items-center gap-1.5">
          <Check className="w-3 h-3" /> Drilled answer saved — used for your prep kit.
        </div>
      ) : null}
    </div>
  );
}

export default function InsightPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#F0F7FF] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A7AFF]" />
      </main>
    }>
      <InsightPageBody />
    </Suspense>
  );
}
