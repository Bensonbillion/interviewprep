import { ScrollReveal } from "./ScrollReveal";

interface Sample {
  name: string;
  role: string;
  company: string;
  prior: string;
  tellMeAboutYourself: string;
  whyQuestion: string;
  whyAnswer: string;
  discoveryQuestion: string;
  discoveryAnswer: string;
}

const SARAH: Sample = {
  name: "Sarah Torres",
  role: "AE",
  company: "Samsara",
  prior: "AE at Motive",
  tellMeAboutYourself:
    "I've spent the last 3 years closing mid-market SaaS into operations-heavy buyers — most recently as an AE at Motive, where I carried a $1.4M quota and finished at 124% by running multi-threaded deals into Fleet Managers, Safety Directors, and CFOs.\n\nWhat pulls me to Samsara is the Connected Operations Cloud thesis — the same buyers I've been selling to are now consolidating telematics, AI Dash Cams, and asset tracking onto one platform, and that's a story I can tell from the operator's point of view.",
  whyQuestion: "Why Samsara?",
  whyAnswer:
    "Honestly — at Motive we lost a real number of deals, and a pattern I kept seeing was buyers wanting camera, telematics, and analytics on one platform instead of stitched together. I've watched Samsara win from the other side of the table. I want to be on that side of it.",
  discoveryQuestion: "Discovery question to ask the hiring manager",
  discoveryAnswer:
    "Walk me through how a top-performing AE on your team is currently winning competitive deals against Motive and Geotab — what's the play, and where do reps usually get stuck?",
};

const MARCUS: Sample = {
  name: "Marcus J.",
  role: "SDR",
  company: "Gong",
  prior: "FOH manager, hospitality",
  tellMeAboutYourself:
    "I spent three years managing front-of-house at a high-volume restaurant group — ran a 15-person team, hit revenue targets every quarter, and built my career on reading people and handling pressure in real time. What I realized is that every skill I developed in hospitality — handling objections, creating urgency, turning a hard no into a yes — is exactly what SDRs do on cold calls.\n\nWhen I decided to pivot into tech sales, I went all in: completed a sales development bootcamp, read Fanatical Prospecting twice, and ran mock cold calls until the framework felt second nature. I chose Gong specifically because I've been watching how revenue intelligence is reshaping how sales teams coach and ramp new reps. I want to be on the inside of that shift — and I'm ready to earn it.",
  whyQuestion: "Why Gong?",
  whyAnswer:
    "I've been following how Gong is used specifically for ramping new SDRs — your coaching features are exactly what I'd want available to me on day one. I want to learn from a company that's built the playbook for what I'm trying to become. The Gong Engage launch in 2024 was the signal: you're not just analyzing calls anymore, you're owning the full SDR motion.",
  discoveryQuestion: "Discovery question to ask the hiring manager",
  discoveryAnswer:
    "What does a top SDR's week actually look like here — what's the activity mix that's hitting the qualified meeting target right now, and what separates the reps on a closer-track path from the ones who plateau at 6 months?",
};

function SampleCard({ sample }: { sample: Sample }) {
  return (
    <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(28,23,19,0.05)] flex flex-col">
      <div className="bg-[#E8735A] px-5 sm:px-6 py-3 flex items-center gap-2">
        <span className="text-white text-[14px] leading-none">✦</span>
        <span className="text-[13px] font-medium text-white tracking-[0.01em]">Example prep kit output</span>
      </div>

      <div className="p-5 sm:p-7 space-y-5 flex-1">
        <div>
          <p className="text-[12px] text-[#9B8E82]">
            {sample.name} → {sample.role} at{" "}
            <span className="font-medium text-[#1C1713]">{sample.company}</span>
          </p>
          <p className="text-[11px] text-[#9B8E82] mt-1">
            Previously: <span className="text-[#1C1713]">{sample.prior}</span>
          </p>
        </div>

        <div>
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#E8735A] mb-2">
            Tell me about yourself
          </p>
          <blockquote className="text-[14px] text-[#3A3530] leading-[1.65] border-l-2 border-[#F1C9BD] pl-4">
            &ldquo;
            {sample.tellMeAboutYourself.split("\n\n").map((para, i) => (
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
            {sample.whyQuestion}
          </p>
          <blockquote className="text-[14px] text-[#3A3530] leading-[1.65] border-l-2 border-[#F1C9BD] pl-4">
            &ldquo;{sample.whyAnswer}&rdquo;
          </blockquote>
        </div>

        <div className="border-t border-[#F1ECE6] pt-5">
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#E8735A] mb-2">
            {sample.discoveryQuestion}
          </p>
          <blockquote className="text-[14px] text-[#3A3530] leading-[1.65] border-l-2 border-[#F1C9BD] pl-4">
            &ldquo;{sample.discoveryAnswer}&rdquo;
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
  );
}

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
        <p className="text-[16px] leading-relaxed text-[#7A6F65] max-w-[560px] mb-12 font-light">
          Two examples — an AE targeting Samsara and an SDR targeting Gong. Both kits are generated from the candidate&apos;s resume against the company&apos;s real interview rubric.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[1200px] mx-auto">
          <SampleCard sample={SARAH} />
          <SampleCard sample={MARCUS} />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={3}>
        <p className="text-[12px] text-[#9B8E82] text-center mt-6">
          Every kit is different — built from your actual experience
        </p>
      </ScrollReveal>
    </section>
  );
}
