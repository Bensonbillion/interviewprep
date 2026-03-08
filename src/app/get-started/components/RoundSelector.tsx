"use client";

import type { InterviewStage, RoleType } from "@/types";
import { RoleCard } from "./RoleCard";

interface Round {
  id: InterviewStage;
  label: string;
  sublabel: string;
}

function getRounds(roleType: RoleType): Round[] {
  const isAE = roleType === "account_executive";
  return [
    {
      id: "recruiter",
      label: "Recruiter Screen",
      sublabel: "Fit, motivation, basics",
    },
    {
      id: "hiring_manager",
      label: "Hiring Manager",
      sublabel: isAE ? "Deal depth, methodology" : "Grit, coachability, STAR",
    },
    {
      id: "role_play",
      label: isAE ? "Demo / Roleplay" : "Cold Call / Roleplay",
      sublabel: isAE ? "Discovery, presentation" : "Structure, objections",
    },
    {
      id: "panel",
      label: "Panel / Final",
      sublabel: "Executive presence, close",
    },
    {
      id: "take_home",
      label: "Take-Home Assignment",
      sublabel: "Cold email, pain points, strategy",
    },
  ];
}

export function getDefaultRound(roleType: RoleType): InterviewStage {
  if (roleType === "account_executive") return "hiring_manager";
  return "recruiter";
}

interface RoundSelectorProps {
  roleType: RoleType;
  selected: InterviewStage | null;
  onChange: (stage: InterviewStage) => void;
}

export function RoundSelector({ roleType, selected, onChange }: RoundSelectorProps) {
  const rounds = getRounds(roleType);
  return (
    <div>
      <p className="text-sm font-medium text-[#0F172A] mb-2.5">
        Which round? <span className="text-[#FF6B4A]">*</span>
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {rounds.map((r) => (
          <RoleCard
            key={r.id}
            label={r.label}
            sublabel={r.sublabel}
            selected={selected === r.id}
            onClick={() => onChange(r.id)}
          />
        ))}
      </div>
    </div>
  );
}
