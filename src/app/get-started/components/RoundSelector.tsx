"use client";

import { useState, useEffect } from "react";
import type { InterviewStage, RoleType, MockCallType, MockCallPersona } from "@/types";
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
  mockCallType: MockCallType;
  onMockCallTypeChange: (type: MockCallType) => void;
  mockCallPersona: MockCallPersona;
  onMockCallPersonaChange: (persona: MockCallPersona) => void;
}

// ─── Sub-card for mock call type / persona selection ─────────────────────────

function SubCard({
  label,
  sublabel,
  selected,
  onClick,
  badge,
}: {
  label: string;
  sublabel: string;
  selected: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full text-left px-4 py-3 rounded-xl border-2 transition-all min-h-[72px] cursor-pointer ${
        selected
          ? "bg-primary-50 border-primary-500 text-[#0F172A]"
          : "bg-white border-cream-300 text-warm-700 hover:border-primary-100"
      }`}
    >
      {badge && (
        <span className="absolute top-2 right-2 bg-coral text-white text-[10px] rounded-full px-2 py-0.5 font-medium">
          {badge}
        </span>
      )}
      <p className={`text-sm font-semibold ${selected ? "text-[#0F172A]" : ""}`}>
        {label}
      </p>
      <p className={`text-xs mt-0.5 ${selected ? "text-primary-500" : "text-warm-500"}`}>
        {sublabel}
      </p>
    </button>
  );
}

// ─── Static data ─────────────────────────────────────────────────────────────

const CALL_TYPES: Array<{ value: string; label: string; sublabel: string; badge?: string }> = [
  { value: "cold_call", label: "Cold Call", sublabel: "Open, pitch, book a meeting" },
  { value: "discovery", label: "Discovery Call", sublabel: "Uncover pain, qualify deep", badge: "Most common" },
  { value: "demo", label: "Demo / Presentation", sublabel: "Present and handle objections" },
  { value: "unsure", label: "Not sure", sublabel: "Show me what\u2019s typical" },
];

const PERSONAS: Array<{ value: string; label: string; sublabel: string }> = [
  { value: "safety_manager", label: "Safety Manager", sublabel: "Incidents, coaching, CSA scores" },
  { value: "fleet_manager", label: "Fleet / Ops Manager", sublabel: "Efficiency, assets, costs" },
  { value: "vp_operations", label: "VP / Director", sublabel: "Strategy, budget, transformation" },
  { value: "unsure_persona", label: "Not sure", sublabel: "Default to Safety Manager" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function RoundSelector({
  roleType,
  selected,
  onChange,
  mockCallType,
  onMockCallTypeChange,
  mockCallPersona,
  onMockCallPersonaChange,
}: RoundSelectorProps) {
  const rounds = getRounds(roleType);

  // Local UI state tracks which card is highlighted (includes 'unsure' values)
  const [selectedCallCard, setSelectedCallCard] = useState<string | null>(null);
  const [selectedPersonaCard, setSelectedPersonaCard] = useState<string | null>(null);

  // Reset local state when stage leaves role_play
  useEffect(() => {
    if (selected !== "role_play") {
      setSelectedCallCard(null);
      setSelectedPersonaCard(null);
    }
  }, [selected]);

  // Reset persona when call type changes away from discovery
  useEffect(() => {
    if (selectedCallCard !== "discovery") {
      setSelectedPersonaCard(null);
      onMockCallPersonaChange(null);
    }
  }, [selectedCallCard, onMockCallPersonaChange]);

  const handleCallTypeClick = (value: string) => {
    setSelectedCallCard(value);
    onMockCallTypeChange(
      value === "unsure" ? null : (value as NonNullable<MockCallType>)
    );
  };

  const handlePersonaClick = (value: string) => {
    setSelectedPersonaCard(value);
    onMockCallPersonaChange(
      value === "unsure_persona" ? null : (value as NonNullable<MockCallPersona>)
    );
  };

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

      {/* Mock call type — visible only for role_play */}
      {selected === "role_play" && (
        <div
          className="mt-4"
          style={{ opacity: 0, animation: "action-reveal 200ms ease-out forwards" }}
        >
          <p className="text-sm font-medium text-[#0F172A] mb-2.5">
            What type of mock call?
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {CALL_TYPES.map((ct) => (
              <SubCard
                key={ct.value}
                label={ct.label}
                sublabel={ct.sublabel}
                selected={selectedCallCard === ct.value}
                onClick={() => handleCallTypeClick(ct.value)}
                badge={ct.badge}
              />
            ))}
          </div>
        </div>
      )}

      {/* Persona — visible only for discovery call type */}
      {selected === "role_play" && selectedCallCard === "discovery" && (
        <div
          className="mt-4"
          style={{ opacity: 0, animation: "action-reveal 200ms ease-out forwards" }}
        >
          <p className="text-sm font-medium text-[#0F172A] mb-2.5">
            Who are you calling?
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {PERSONAS.map((p) => (
              <SubCard
                key={p.value}
                label={p.label}
                sublabel={p.sublabel}
                selected={selectedPersonaCard === p.value}
                onClick={() => handlePersonaClick(p.value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
