import { ScrollReveal } from "./ScrollReveal";

const SAMPLE = {
  name: "Sarah Torres",
  role: "AE",
  company: "Samsara",
  tellMeAboutYourself:
    "I've spent the last 3 years closing mid-market SaaS into operations-heavy buyers — most recently as an AE at Motive, where I carried a $1.4M quota and finished at 124% by running multi-threaded deals into Fleet Managers, Safety Directors, and CFOs.\n\nWhat pulls me to Samsara is the Connected Operations Cloud thesis — the same buyers I've been selling to are now consolidating telematics, AI Dash Cams, and asset tracking onto one platform, and that's a story I can tell from the operator's point of view.",
  whyQuestion: "Why Samsara?",
  whyAnswer:
    "Two reasons. First, I've watched the IoT category since the 2021 IPO and Samsara is the only player with the integrated camera + telematics + analytics story — the rest are point solutions. Second, this role lands me in front of the exact buyer I've been selling: a VP Ops already paying for fragmented tools. The pitch sells itself when you can show them one platform instead of four.",
  discoveryQuestion: "Discovery question to ask the hiring manager",
  discoveryAnswer:
    "Walk me through how a top-performing AE on your team is currently winning competitive deals against Motive and Geotab — what's the play, and where do reps usually get stuck?",
};

export function KitOutputExample() {
  return (
    <section className="px-6 sm:px-14 py-20 bg-[#F7F6F3] border-b border-[#E8E4DF]">
      <ScrollReveal>
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#E8735A] mb-[14px]">Sample output</p>
      </ScrollReveal>
      <ScrollReveal delay={1}>
        <h2 className="font-[family-name:var(--font-serif)] text-[36px] sm:text-[46px] leading-[1.08] tracking-[-0.8px] text-[#1C1713] max-w-[560px] mb-2">
          Your kit, populated.
        </h2>
      </ScrollReveal>
      <ScrollReveal delay={2}>
        <p className="text-[16px] leading-relaxed text-[#7A6F65] max-w-[520px] mb-12 font-light">
          Here&apos;s the kind of output you&apos;d get if you uploaded your resume and targeted the AE role at Samsara above.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={2}>
        <div className="bg-white border border-[#E8E4DF] rounded-2xl max-w-[760px] mx-auto overflow-hidden shadow-[0_4px_24px_rgba(28,23,19,0.05)]">
          <div className="bg-[#E8735A] px-5 sm:px-6 py-3 flex items-center gap-2">
            <span className="text-white text-[14px] leading-none">✦</span>
            <span className="text-[13px] font-medium text-white tracking-[0.01em]">Example prep kit output</span>
          </div>

          <div className="p-5 sm:p-7 space-y-5">
            <p className="text-[12px] text-[#9B8E82]">
              {SAMPLE.name} → {SAMPLE.role} at{" "}
              <span className="font-medium text-[#1C1713]">{SAMPLE.company}</span>
            </p>

            <div>
              <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#E8735A] mb-2">
                Tell me about yourself
              </p>
              <blockquote className="text-[14px] text-[#3A3530] leading-[1.65] border-l-2 border-[#F1C9BD] pl-4">
                &ldquo;
                {SAMPLE.tellMeAboutYourself.split("\n\n").map((para, i) => (
                  <span key={i}>
                    {i > 0 && (
                      <>
                        <br />
                        <br />
                      </>
                    )}
                    {para}
                  </span>
                ))}
                &rdquo;
              </blockquote>
            </div>

            <div className="border-t border-[#F1ECE6] pt-5">
              <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#E8735A] mb-2">
                {SAMPLE.whyQuestion}
              </p>
              <blockquote className="text-[14px] text-[#3A3530] leading-[1.65] border-l-2 border-[#F1C9BD] pl-4">
                &ldquo;{SAMPLE.whyAnswer}&rdquo;
              </blockquote>
            </div>

            <div className="border-t border-[#F1ECE6] pt-5">
              <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#E8735A] mb-2">
                {SAMPLE.discoveryQuestion}
              </p>
              <blockquote className="text-[14px] text-[#3A3530] leading-[1.65] border-l-2 border-[#F1C9BD] pl-4">
                &ldquo;{SAMPLE.discoveryAnswer}&rdquo;
              </blockquote>
            </div>
          </div>

          <div className="bg-[#FAF8F4] px-5 sm:px-6 py-3 border-t border-[#E8E4DF]">
            <p className="text-[11px] text-[#9B8E82] text-center">
              Built from <strong className="text-[#1C1713] font-medium">your resume</strong> · personalized for{" "}
              <strong className="text-[#1C1713] font-medium">your target company</strong>
            </p>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={3}>
        <p className="text-[12px] text-[#9B8E82] text-center mt-4">
          Every kit is different — built from your actual experience
        </p>
      </ScrollReveal>
    </section>
  );
}
