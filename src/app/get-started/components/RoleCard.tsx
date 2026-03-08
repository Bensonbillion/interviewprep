"use client";

interface RoleCardProps {
  label: string;
  sublabel: string;
  selected: boolean;
  onClick: () => void;
}

export function RoleCard({ label, sublabel, selected, onClick }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all min-h-[60px] ${
        selected
          ? "border-[#4A7AFF] bg-[#4A7AFF] shadow-[0_4px_12px_rgba(74,122,255,0.25)]"
          : "border-[#DBEAFE] bg-white hover:border-[#4A7AFF]"
      }`}
    >
      <p className={`text-sm font-semibold ${selected ? "text-white" : "text-[#0F172A]"}`}>
        {label}
      </p>
      <p className={`text-xs mt-0.5 ${selected ? "text-blue-100" : "text-[#64748B]"}`}>
        {sublabel}
      </p>
    </button>
  );
}
