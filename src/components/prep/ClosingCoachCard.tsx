"use client";

import type { InterviewStage, RoleType } from "@/types";

interface ClosingCoachCardProps {
  stage: InterviewStage;
  roleType: RoleType;
  companyName: string;
}

const CLOSING_SCRIPTS: Partial<Record<InterviewStage, { title: string; script: string; reminder: string }>> = {
  recruiter: {
    title: "How to close the recruiter call",
    script:
      "\"Before we wrap up — I want to be direct. I'm genuinely excited about this role. What are your thoughts on my candidacy so far, and what would the next step look like?\"",
    reminder:
      "Recruiters advance candidates who show clear enthusiasm. Ending without asking for next steps signals low interest.",
  },
  hiring_manager: {
    title: "How to close the hiring manager round",
    script:
      "\"I really enjoyed this conversation — this role is exactly the kind of challenge I'm looking for. Based on what you've heard today, is there anything you'd want me to clarify before we move forward?\"",
    reminder:
      "HMs remember candidates who close. It's also your chance to handle any remaining objections before they decide without you.",
  },
  role_play: {
    title: "How to close the role play debrief",
    script:
      "\"I appreciate the feedback — honestly, that's exactly the kind of coaching I want more of. Can you tell me what you look for in top performers at this stage, and how you feel I stacked up today?\"",
    reminder:
      "The role play isn't just about the call — it's about how you take feedback. Asking this shows self-awareness and coachability.",
  },
  panel: {
    title: "How to close the panel / final round",
    script:
      "\"I want to be clear — I want this job. The more I've learned about what you're building and this team, the more certain I am this is the right next step for me. What would it take for me to be the obvious choice?\"",
    reminder:
      "Panel rounds are where most candidates get eliminated by NOT asking for the job. Being direct about wanting it is a differentiator.",
  },
};

export function ClosingCoachCard({ stage, roleType, companyName }: ClosingCoachCardProps) {
  const coach = CLOSING_SCRIPTS[stage];
  if (!coach) return null;

  const isAE = roleType === "account_executive";

  return (
    <div className="bg-gradient-to-br from-ink to-ink/90 rounded-2xl p-5 text-white">
      <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">
        Closing move
      </p>
      <p className="text-sm font-bold text-white mb-3">{coach.title}</p>

      <div className="bg-white/10 rounded-xl px-4 py-3 mb-3">
        <p className="text-sm text-white/90 leading-relaxed italic">{coach.script}</p>
      </div>

      <p className="text-xs text-white/60 leading-relaxed">{coach.reminder}</p>

      {isAE && stage === "hiring_manager" && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="text-xs text-white/70 leading-relaxed">
            <span className="font-semibold text-white/90">AE tip:</span> If they have any doubts about deal size or methodology, address them directly before leaving. &ldquo;Is there anything about my deal experience that gives you pause?&rdquo; is a closer&apos;s move.
          </p>
        </div>
      )}

      <p className="text-xs text-white/40 mt-3">
        Tailored for {companyName} · {stage.replace("_", " ")} round
      </p>
    </div>
  );
}
