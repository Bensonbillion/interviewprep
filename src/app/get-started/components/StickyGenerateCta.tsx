"use client";

interface StickyGenerateCtaProps {
  canGenerate: boolean;
  onGenerate: () => void;
  creditsRemaining: number;
}

export function StickyGenerateCta({
  canGenerate,
  onGenerate,
  creditsRemaining,
}: StickyGenerateCtaProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-3 pb-[max(env(safe-area-inset-bottom),12px)] z-40">
      <button
        type="button"
        disabled={!canGenerate}
        onClick={onGenerate}
        className="w-full py-3.5 bg-[#FF6B4A] hover:bg-[#E85D3A] text-white font-bold rounded-xl text-base transition-all shadow-md disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
      >
        Generate my prep kit →
      </button>
      <p className="text-xs text-[#94A3B8] text-center mt-1.5">
        Uses 1 of your {creditsRemaining} free prep kit
        {creditsRemaining !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
