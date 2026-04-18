/**
 * Builds the flat card list for live interview mode.
 * Cards are ordered by interview phase:
 *   1. People (read before the call)
 *   2. Timing (during presentation)
 *   3. Weak spots (Q&A — highest severity first)
 *   4. Hard questions (Q&A)
 *   5. Discovery roleplay (at end of panel)
 *   6. Cheat sheet (anytime, permission to stop last)
 */

export type LiveCard = {
  id: string;
  phase: "people" | "timing" | "weak" | "question" | "roleplay" | "cheat";
  title: string;
  body: string;
  sub?: string;
  badge?: string;
  badgeColor?: string;
  phaseOrder: number;
};

interface SessionInterviewer {
  name: string;
  title: string | null;
  profile_data: Record<string, unknown> | null;
}

interface GeneratedAnswer {
  answer_type: string;
  content: string;
}

export function buildLiveCards(
  answers: GeneratedAnswer[],
  interviewers: SessionInterviewer[]
): LiveCard[] {
  const cards: LiveCard[] = [];

  // Phase 1: People (read before the call)
  interviewers.forEach((iv, i) => {
    const p = iv.profile_data ?? {};
    cards.push({
      id: `person-${i}`,
      phase: "people",
      phaseOrder: 1,
      title: `${iv.name} — ${iv.title ?? "interviewer"}`,
      body: (p.how_to_talk_to_them as string) ?? (p.career_summary as string) ?? "",
      sub: p.watch_outs ? `Watch: ${p.watch_outs}` : undefined,
      badge: iv.title ?? undefined,
    });
  });

  // Phase 2: Timing (during presentation)
  const timingAnswer = answers.find((a) => a.answer_type === "presentation_structure");
  if (timingAnswer) {
    const timing = parseContent(timingAnswer.content);
    const slides = Array.isArray(timing) ? timing : (timing as Record<string, unknown>)?.slides ?? [];
    (slides as Array<Record<string, unknown>>).forEach((slide, i) => {
      cards.push({
        id: `timing-${i}`,
        phase: "timing",
        phaseOrder: 2,
        title: `${slide.time_range} — ${slide.slide}`,
        body: (slide.key_move as string) ?? "",
        sub: (slide.tip as string) ?? undefined,
        badge: (slide.risk as string) ?? undefined,
        badgeColor: slide.risk ? "#EF9F27" : undefined,
      });
    });
  }

  // Phase 3: Weak spots (Q&A — highest severity first)
  const weakAnswer = answers.find((a) => a.answer_type === "weakness_audit");
  if (weakAnswer) {
    const audit = parseContent(weakAnswer.content);
    const spots = Array.isArray(audit)
      ? audit
      : (audit as Record<string, unknown>)?.weak_spots ?? [];
    const sorted = [...(spots as Array<Record<string, unknown>>)].sort((a, b) => {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (order[a.severity as string] ?? 2) - (order[b.severity as string] ?? 2);
    });
    sorted.forEach((w, i) => {
      cards.push({
        id: `weak-${i}`,
        phase: "weak",
        phaseOrder: 3,
        title: (w.likely_question as string) ?? "",
        body: (w.model_answer as string) ?? "",
        sub: `Avoid: ${(w.trap_to_avoid as string) ?? ""}`,
        badge: (w.severity as string) ?? "medium",
        badgeColor: w.severity === "high" ? "#E24B4A" : "#EF9F27",
      });
    });
  }

  // Phase 4: Hard questions (Q&A)
  const qAnswer = answers.find((a) => a.answer_type === "defense_questions");
  if (qAnswer) {
    const qs = parseContent(qAnswer.content);
    const questions = Array.isArray(qs) ? qs : [];
    (questions as Array<Record<string, unknown>>).forEach((q, i) => {
      cards.push({
        id: `q-${i}`,
        phase: "question",
        phaseOrder: 4,
        title: (q.question as string) ?? "",
        body: (q.model_answer as string) ?? "",
        sub: q.trap_to_avoid ? `Trap: ${q.trap_to_avoid}` : undefined,
        badge: (q.asked_by as string) ?? undefined,
      });
    });
  }

  // Phase 5: Discovery roleplay (at end of panel)
  const rpAnswer = answers.find((a) => a.answer_type === "role_play_script");
  if (rpAnswer) {
    const rp = parseContent(rpAnswer.content) as Record<string, unknown>;
    const lines = (rp?.lines ?? []) as Array<Record<string, unknown>>;

    // Add the golden rule as first roleplay card
    if (rp?.golden_rule) {
      cards.push({
        id: "rp-rule",
        phase: "roleplay",
        phaseOrder: 5,
        title: "The one rule for the roleplay",
        body: rp.golden_rule as string,
      });
    }

    lines
      .filter((l) => l.speaker === "you")
      .forEach((l, i) => {
        cards.push({
          id: `rp-${i}`,
          phase: "roleplay",
          phaseOrder: 5,
          title: `Line ${i + 1} — you say:`,
          body: (l.text as string) ?? "",
          sub: (l.coaching as string) ?? undefined,
        });
      });
  }

  // Phase 6: Cheat sheet (anytime, power close last)
  const cheatAnswer = answers.find((a) => a.answer_type === "cheat_sheet");
  if (cheatAnswer) {
    const cheat = parseContent(cheatAnswer.content) as Record<string, unknown>;
    const points = (cheat?.points ?? []) as Array<Record<string, unknown>>;
    points.forEach((p, i) => {
      cards.push({
        id: `cheat-${i}`,
        phase: "cheat",
        phaseOrder: 6,
        title: (p.point as string) ?? "",
        body: (p.detail as string) ?? "",
        badge: (p.who_its_for as string) ?? undefined,
      });
    });

    // Permission to stop — always last
    if (cheat?.permission_to_stop) {
      cards.push({
        id: "permission",
        phase: "cheat",
        phaseOrder: 6,
        title: "You\u2019re ready.",
        body: cheat.permission_to_stop as string,
      });
    }
  }

  // Sort by phaseOrder, then by insertion order within phase
  return cards.sort((a, b) => a.phaseOrder - b.phaseOrder);
}

function parseContent(content: string): Record<string, unknown> | unknown[] {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}
