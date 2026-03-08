"use client";

import { useState, Suspense } from "react";
import type { RoleType } from "@/types";
import { StepRoleAuth } from "./StepRoleAuth";
import { SampleAnswerPreview } from "./SampleAnswerPreview";

export function GetStartedContent() {
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      {/* Left: form card */}
      <div className="bg-white rounded-2xl border border-[#DBEAFE] p-5 shadow-[0_4px_24px_rgba(74,122,255,0.06)]">
        <h1 className="text-xl font-bold text-[#0F172A] mb-1">
          What role are you interviewing for?
        </h1>
        <p className="text-sm text-[#64748B] mb-5">
          We&apos;ll personalize every answer to your role and experience.
        </p>
        <Suspense>
          <StepRoleAuth onRoleChange={setSelectedRole} />
        </Suspense>
        <p className="text-xs text-center text-[#94A3B8] mt-5">
          Your first 3 prep kits are free · No credit card required
        </p>
      </div>

      {/* Right: dynamic sample preview — updates on role tap */}
      <SampleAnswerPreview selectedRole={selectedRole} />
    </div>
  );
}
