const PREP_ITEMS = [
  { icon: "💬", text: '"Tell me about yourself" script' },
  { icon: "🏢", text: '"Why this company?" with recent research' },
  { icon: "📋", text: "Role-specific behavioral questions" },
  { icon: "💪", text: "Weakness & strength frameworks" },
  { icon: "❓", text: "Questions to ask your interviewer" },
];

interface PrepKitPreviewProps {
  companyName: string;
}

export function PrepKitPreview({ companyName }: PrepKitPreviewProps) {
  return (
    <div className="hidden md:block">
      <div className="bg-white rounded-2xl border border-[#DBEAFE] p-6 sticky top-20">
        <h3 className="text-base font-bold text-[#0F172A] mb-4">
          Your prep kit will include:
        </h3>

        <div className="space-y-3.5">
          {PREP_ITEMS.map((item) => (
            <div key={item.text} className="flex items-start gap-3">
              <span className="text-base mt-0.5">{item.icon}</span>
              <span className="text-sm text-[#475569]">{item.text}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-[#64748B] leading-relaxed">
            Personalized from <strong>your resume</strong> +{" "}
            <strong>{companyName || "company"}</strong> research.
          </p>
        </div>

        <div className="mt-4 bg-[#F0F7FF] rounded-lg px-3 py-2.5">
          <p className="text-xs text-[#94A3B8] text-center">⏱ Usually takes 30–60 seconds</p>
        </div>
      </div>
    </div>
  );
}
