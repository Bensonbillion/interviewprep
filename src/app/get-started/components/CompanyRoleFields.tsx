"use client";

import { useState } from "react";
import type { RoleType } from "@/types";

const ROLE_PLACEHOLDERS: Record<RoleType, string> = {
  sdr_bdr: "e.g. Senior SDR, Inbound BDR",
  account_executive: "e.g. Enterprise AE, Mid-Market AE",
  account_manager_csm: "e.g. Strategic CSM, Enterprise AM",
  other_sales: "e.g. Sales Engineer, Revenue Ops",
};

interface CompanyRoleFieldsProps {
  companyName: string;
  roleTitle: string;
  isCompanyAutoFilled: boolean;
  isRoleAutoFilled: boolean;
  roleType: RoleType;
  onCompanyChange: (v: string) => void;
  onRoleChange: (v: string) => void;
}

export function CompanyRoleFields({
  companyName,
  roleTitle,
  isCompanyAutoFilled,
  isRoleAutoFilled,
  roleType,
  onCompanyChange,
  onRoleChange,
}: CompanyRoleFieldsProps) {
  const [showCompanySignal, setShowCompanySignal] = useState(false);
  const [companySignaled, setCompanySignaled] = useState(false);

  const handleCompanyBlur = () => {
    if (companyName.trim() && !companySignaled && !isCompanyAutoFilled) {
      setCompanySignaled(true);
      setShowCompanySignal(true);
      setTimeout(() => setShowCompanySignal(false), 3000);
    }
  };

  const inputBase =
    "w-full py-3 px-4 border rounded-xl outline-none transition-all placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#4A7AFF]/20 focus:border-[#4A7AFF]";
  const normalInput = `${inputBase} border-[#DBEAFE] bg-white`;
  const autoFilledInput = `${inputBase} border-[#BFDBFE] bg-[#EFF6FF]/40`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Company name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#0F172A]">
          Company name <span className="text-[#FF6B4A]">*</span>
        </label>
        <input
          type="text"
          autoComplete="organization"
          placeholder="e.g. Salesforce, Gong, HubSpot"
          value={companyName}
          onChange={(e) => onCompanyChange(e.target.value)}
          onBlur={handleCompanyBlur}
          className={isCompanyAutoFilled && companyName ? autoFilledInput : normalInput}
          style={{ fontSize: "16px" }}
        />
        {isCompanyAutoFilled && companyName && (
          <span className="text-xs text-[#4A7AFF] flex items-center gap-1">
            ✦ Auto-filled from job listing
          </span>
        )}
        {showCompanySignal && (
          <span className="text-xs text-[#4A7AFF] animate-fade-in">
            ✓ We&apos;ll research {companyName} for your prep kit
          </span>
        )}
      </div>

      {/* Role title */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#0F172A]">
          Role title <span className="text-[#FF6B4A]">*</span>
        </label>
        <input
          type="text"
          autoComplete="organization-title"
          placeholder={ROLE_PLACEHOLDERS[roleType]}
          value={roleTitle}
          onChange={(e) => onRoleChange(e.target.value)}
          className={isRoleAutoFilled && roleTitle ? autoFilledInput : normalInput}
          style={{ fontSize: "16px" }}
        />
        {isRoleAutoFilled && roleTitle && (
          <span className="text-xs text-[#4A7AFF] flex items-center gap-1">
            ✦ Auto-filled from job listing
          </span>
        )}
      </div>
    </div>
  );
}
