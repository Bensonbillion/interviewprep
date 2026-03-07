import { NextRequest, NextResponse } from "next/server";
// Legacy route — superseded by /api/generate-prep in v1.0
// Kept for backwards compatibility only
import { anthropic, HAIKU } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { aiLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { randomUUID } from "crypto";
type InterviewRound = "recruiter" | "hiring_manager" | "roleplay" | "panel";
interface InterviewQuestion { id: string; round: InterviewRound; question: string; category: string; hint?: string; }
interface ResumeData { rawText: string; name?: string; currentRole?: string; experience: string[]; achievements: string[]; skills: string[]; }

interface RequestBody {
  resumeData: ResumeData;
  jobDescription: string;
  companyName: string;
  targetRole: string;
}

const ROUND_DESCRIPTIONS: Record<InterviewRound, string> = {
  recruiter:
    "Initial recruiter screen (15-30 min): motivation, communication, basic fit, salary alignment, why sales, why this company",
  hiring_manager:
    "Hiring manager interview (30-45 min): behavioral STAR questions about grit, resilience, work ethic, quota attainment, deal stories, competitive wins, objection handling mindset",
  roleplay:
    "Cold call / role play assessment (30-60 min): situational questions about the mock cold call scenario, discovery questions, objection handling, closing for next steps, coachability after feedback",
  panel:
    "Panel / final round (30-60 min): cultural fit, career trajectory, executive presence, self-awareness, questions the candidate should ask, closing the interviewer for the job",
};

export async function POST(req: NextRequest) {
  const auth = await verifyApiAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, headers: rlHeaders } = await checkRateLimit(aiLimiter, auth.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: rlHeaders }
    );
  }

  try {
    const body: RequestBody = await req.json();
    const { resumeData, jobDescription, companyName, targetRole } = body;

    const resumeSummary = [
      resumeData.currentRole
        ? `Current role: ${resumeData.currentRole}`
        : null,
      resumeData.achievements.length
        ? `Key achievements: ${resumeData.achievements.slice(0, 5).join("; ")}`
        : null,
      resumeData.experience.length
        ? `Experience: ${resumeData.experience.slice(0, 4).join("; ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    // Generate 4 rounds in parallel with GPT-4o-mini (cost-efficient)
    const rounds: InterviewRound[] = [
      "recruiter",
      "hiring_manager",
      "roleplay",
      "panel",
    ];

    const roundPromises = rounds.map(async (round) => {
      const response = await anthropic.messages.create({
        model: HAIKU,
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `Generate 5 tailored interview questions for a ${round.replace("_", " ")} round.
Round context: ${ROUND_DESCRIPTIONS[round]}
Company: ${companyName} | Role: ${targetRole}
Candidate: ${resumeSummary}
Return ONLY valid JSON: {"questions":[{"question":"...","category":"...","hint":"..."}]}`,
          },
        ],
      });

      const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
      const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(jsonText) as { questions: Array<{ question: string; category: string; hint?: string }> };

      return (parsed.questions ?? []).map((q) => ({
        id: randomUUID(),
        round,
        question: q.question,
        category: q.category,
        hint: q.hint,
      })) as InterviewQuestion[];
    });

    const questionsByRound = await Promise.all(roundPromises);
    const questions = questionsByRound.flat();

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("Question generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
