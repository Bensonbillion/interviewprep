import { NextRequest, NextResponse } from "next/server";
import { anthropic, SONNET } from "@/lib/ai";
import { verifyApiAuth } from "@/lib/auth/verify";
import { aiLimiter, checkRateLimit } from "@/lib/security/rate-limit";
import { getKnowledgeForStage } from "@/lib/knowledge-base";
import {
  ParsedResume,
  CompanyProfile,
  RelevanceMap,
  InterviewStage,
  PrepKit,
} from "@/types";

interface RequestBody {
  resume: ParsedResume;
  company: CompanyProfile;
  relevanceMap: RelevanceMap;
  jobDescription: string;
  targetRole: string;
  stage: InterviewStage;
}

// ─── Stage-specific output schemas ───────────────────────────────────────────

const STAGE_SCHEMAS: Record<InterviewStage, string> = {
  recruiter: `{
  "stage": "recruiter",
  "tmay": "60–90 second Tell Me About Yourself narrative. Structure: start from earliest relevant role, build chronologically to most recent, end with a forward bridge: 'Which is why I'm here talking to [Company] about the [Role].' Sound like a confident salesperson, not a robot. Use the candidate's actual background.",
  "filterAnswers": [
    { "question": "Why sales?", "answer": "Personalized to their background with a specific story or moment. Not generic. 75–150 words." },
    { "question": "Why [Company]?", "answer": "Specific to the company's product, market position, and recent news. Show real research. 75–150 words." },
    { "question": "What are your comp expectations?", "answer": "Confident, aligned to market, leaves room for negotiation. 2–3 sentences." },
    { "question": "Tell me about your background.", "answer": "Slightly different from TMAY — more casual/conversational. 75–100 words." }
  ],
  "recruiterDecoder": "2–3 sentences explaining what the recruiter is ACTUALLY evaluating in this round — the hidden evaluation criteria beyond the stated questions.",
  "cheatSheet": {
    "keyPoints": ["3–4 resume highlights most relevant to this company/role"],
    "companyFacts": ["3–4 specific facts about this company to reference"],
    "strongestStory": "The single best story from their resume to tell in this round — 1–2 sentences.",
    "criticalTip": "The single most important thing to do/avoid in this specific round."
  }
}`,

  hiring_manager: `{
  "stage": "hiring_manager",
  "starAnswers": [
    {
      "question": "Behavioral question text",
      "answer": "Full STAR answer built from the candidate's actual resume bullets. 150–225 words. Includes specific metrics, names, outcomes. Sounds authentic — like a salesperson telling a story, not reading a script.",
      "resumeSource": "Which specific resume bullet or role this draws from"
    }
  ],
  "careerSwitcherBridges": [
    { "situation": "Interview question or moment when background comes up", "bridge": "Exact framing to use — confident, not apologetic" }
  ],
  "questionsToAsk": [
    "4–5 sharp questions the candidate should ask. Must demonstrate genuine curiosity about the role, team, and company. Sales-savvy questions that signal they think like a seller, not just a job seeker."
  ],
  "cheatSheet": {
    "keyPoints": ["3–4 behavioral stories to have ready"],
    "companyFacts": ["3–4 specific company facts to weave in"],
    "strongestStory": "The single best STAR story from their background for this round.",
    "criticalTip": "The most important thing to demonstrate coachability or grit in this round."
  }
}`,

  role_play: `{
  "stage": "role_play",
  "coldCallScript": {
    "opener": "Pattern interrupt opener — direct, confident, brief. References the company's actual product and prospect persona. 2–3 sentences max.",
    "qualifyingQuestions": [
      "Discovery question 1 — open-ended, about their current pain/process",
      "Discovery question 2 — follow-up to go deeper",
      "Discovery question 3 — qualification or urgency"
    ],
    "valueProp": "1–2 sentence value prop built on the company's actual product and ICP. Problem-first framing: 'Based on what you said about [pain], that's exactly why [Company] exists. We help [ICP] [outcome] without [obstacle].'",
    "objectionResponses": [
      { "objection": "Not interested / We're all set", "response": "Specific response that acknowledges, reframes, and asks a question" },
      { "objection": "Send me an email", "response": "Specific response" },
      { "objection": "We already have a solution", "response": "Specific response" },
      { "objection": "Not the right time", "response": "Specific response" },
      { "objection": "I'm busy / I have to go", "response": "Specific response" }
    ],
    "close": "Specific ask for next step — meeting, demo, follow-up call. Concrete and assumptive but not pushy."
  },
  "coachabilityCoaching": "3–4 sentences on exactly how to handle the feedback moment after the first call attempt. What to say, how to respond, what to implement on the second attempt.",
  "practicePrompts": [
    "3–4 specific practice scenarios or variations to run through alone or with a friend before the interview"
  ],
  "cheatSheet": {
    "keyPoints": ["Company product one-liner", "ICP one-liner", "Top value prop", "First discovery question to memorize"],
    "companyFacts": ["Product name and what it does", "Target buyer", "Key differentiator"],
    "strongestStory": "A brief story from their background demonstrating they can handle rejection/pressure.",
    "criticalTip": "The most important thing to remember: ask discovery questions BEFORE pitching."
  }
}`,

  panel: `{
  "stage": "panel",
  "researchTalkingPoints": [
    "4–5 specific talking points showing deep company research — product, market, competitive landscape, recent news, growth trajectory. Each point should be something a well-prepared candidate would naturally work into conversation."
  ],
  "questionsToAsk": [
    {
      "question": "Sharp, sales-savvy question that demonstrates research and genuine curiosity",
      "why": "Why this question signals strong sales thinking / genuine interest"
    }
  ],
  "presenceCoaching": "3–4 sentences on energy, enthusiasm, and executive presence for this specific round. What to bring, what to avoid, how to sustain energy after a long process.",
  "closeTheInterviewer": "The exact language to use at the end of the final round to express interest and ask for the job. Specific, confident, not desperate. Should sound like a natural closer.",
  "cheatSheet": {
    "keyPoints": ["4–5 key resume/background points to emphasize for consistency with earlier rounds"],
    "companyFacts": ["4–5 specific facts to reference that show depth of research"],
    "strongestStory": "The through-line story of this candidate's journey that connects all rounds.",
    "criticalTip": "The most important thing to do in the final round that most candidates miss."
  }
}`,

  take_home: `{
  "stage": "take_home",
  "coldEmail": {
    "subject": "Specific, personalized subject line — no spam words",
    "body": "100–150 word cold email to a realistic prospect at the target company's ICP. Opens with a specific trigger (news, growth signal, pain indicator). Connects company product to ICP pain. Soft CTA for 15 minutes.",
    "ps": "Optional PS line that gives a second reason to reply"
  },
  "painPointAnalysis": {
    "icpProfile": "2–3 sentence description of who the company sells to",
    "topPainPoints": [
      { "pain": "Specific operational pain", "impact": "Business impact of this pain", "solution": "How this company solves it specifically" }
    ],
    "prospectingTriggers": ["3–5 specific signals a prospect is experiencing this pain right now"],
    "candidateAngle": "1 paragraph on which pain point this candidate is best positioned to lead with given their background"
  },
  "assignmentGuide": {
    "whatTheyreGrading": ["3–4 bullet points on what the hiring team actually evaluates"],
    "topTenPercentMove": "What separates top submissions — specific, actionable",
    "submissionChecklist": ["7–10 items to verify before submitting"],
    "commonMistakes": ["4–5 specific tactical errors to avoid"],
    "candidateEdge": "This candidate's strongest angle for this specific assignment"
  },
  "cheatSheet": {
    "keyPoints": ["3–4 key points to keep in mind while completing the assignment"],
    "companyFacts": ["3–4 specific company and ICP facts to reference in the submission"],
    "strongestStory": "The single best piece of background to reference or draw from in the assignment.",
    "criticalTip": "The most important thing most candidates forget that this candidate must include."
  }
}`,
};

const STAGE_NAMES: Record<InterviewStage, string> = {
  recruiter: "Recruiter Screen",
  hiring_manager: "Hiring Manager Interview",
  role_play: "Cold Call / Role Play Assessment",
  panel: "Panel / Final Round",
  take_home: "Take-Home Sales Assignment",
};

// ─── Questions to include per stage ──────────────────────────────────────────

const HIRING_MANAGER_QUESTIONS = [
  "Tell me about a time you overcame a significant obstacle or failure.",
  "Describe a time you were rejected repeatedly and kept going.",
  "Tell me about a time you received feedback that was hard to hear. How did you respond?",
  "Tell me about your most meaningful professional achievement.",
  "Describe a time you went above and beyond what was expected.",
  "Tell me about a time you had to learn something new very quickly.",
  "Where do you see yourself in 2–3 years?",
  "Why do you want to work in sales specifically?",
];

export async function POST(req: NextRequest) {
  try {
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

    const body: RequestBody = await req.json();
    const { resume, company, relevanceMap, jobDescription, targetRole, stage } = body;

    // Get knowledge base docs for this stage + background type
    const knowledgeBase = getKnowledgeForStage(stage, resume.backgroundType);

    // Build resume context — top bullets by sales relevance
    const topBullets = resume.roles
      .flatMap((r) =>
        r.bullets.map((b) => ({
          ...b,
          role: `${r.title} at ${r.company} (${r.startDate}–${r.endDate})`,
        }))
      )
      .sort((a, b) => b.salesRelevanceScore - a.salesRelevanceScore)
      .slice(0, 10)
      .map(
        (b) =>
          `• [${b.role}] ${b.originalText}${b.extractedMetrics.length ? ` [metrics: ${b.extractedMetrics.join(", ")}]` : ""}`
      )
      .join("\n");

    const systemPrompt = `You are an expert SDR/BDR/AE interview coach generating highly personalized interview prep content.

KNOWLEDGE BASE:
${knowledgeBase}

GUARDRAILS (non-negotiable):
1. Every behavioral answer MUST trace to a specific resume bullet — never fabricate achievements
2. Every company reference MUST come from the company profile — never hallucinate company facts
3. Answers must sound like a confident salesperson, not a corporate cover letter
4. Career switcher? Translate their background using the career switcher guide — never apologize for their background
5. Behavioral STAR answers: 150–225 words (60–90 seconds spoken)
6. "Tell me about yourself": 175–225 words structured chronologically, ending with a forward bridge`;

    const userPrompt = `Generate a complete ${STAGE_NAMES[stage]} prep kit for this candidate.

CANDIDATE PROFILE:
Background type: ${resume.backgroundType}
Narrative: ${resume.narrativeSummary}

Top resume bullets (by sales relevance):
${topBullets}

COMPANY PROFILE:
Company: ${company.name}
Product: ${company.productDescription}
ICP: ${JSON.stringify(company.icp)}
Sales motion: ${company.salesMotion}
Stage: ${company.stage}
Competitors: ${company.competitors.join(", ") || "unknown"}
Recent news: ${company.recentNews.join("; ") || "none"}
Culture: ${company.cultureSignals.join("; ") || "none"}

RELEVANCE MAP:
Strong matches: ${relevanceMap.strongMatches.map((m) => m.resumeItem + " → " + m.relevance).join("; ")}
Gaps to address: ${relevanceMap.gaps.map((g) => g.gap + " (bridge: " + g.bridgingStrategy + ")").join("; ")}
Lead stories: ${relevanceMap.leadStories.join("; ")}
${relevanceMap.careerSwitcherBridges?.length ? `Career switcher bridges: ${relevanceMap.careerSwitcherBridges.map((b) => b.originalExperience + " → " + b.salesTranslation).join("; ")}` : ""}

TARGET ROLE: ${targetRole} at ${company.name}
JOB DESCRIPTION: ${jobDescription.slice(0, 800)}

${stage === "hiring_manager" ? `Use these specific questions for the 6–8 STAR answers:\n${HIRING_MANAGER_QUESTIONS.join("\n")}` : ""}

Return ONLY valid JSON matching this schema exactly (no markdown, no extra fields):
${STAGE_SCHEMAS[stage]}`;

    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const jsonText = content.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const prepKit = JSON.parse(jsonText) as PrepKit;

    return NextResponse.json({ prepKit });
  } catch (err) {
    console.error("Generate prep error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to generate prep kit. Please try again." },
      { status: 500 }
    );
  }
}
