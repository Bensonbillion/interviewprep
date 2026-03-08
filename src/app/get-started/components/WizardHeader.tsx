import { Check } from "lucide-react";

interface WizardHeaderProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { label: "Role" },
  { label: "Resume" },
  { label: "Company" },
];

export function WizardHeader({ currentStep }: WizardHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-1.5">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div key={step.label} className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                  isActive
                    ? "bg-[#4A7AFF] text-white"
                    : isCompleted
                    ? "bg-[#10B981] text-white"
                    : "bg-[#DBEAFE] text-[#94A3B8]"
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : stepNum}
              </div>
              <span
                className={`text-sm whitespace-nowrap ${
                  isActive
                    ? "font-semibold text-[#4A7AFF]"
                    : isCompleted
                    ? "text-[#059669]"
                    : "text-[#94A3B8]"
                }`}
              >
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="w-8 md:w-16 h-px bg-[#DBEAFE] mx-1 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
