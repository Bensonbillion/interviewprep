import { HeroCTA } from "./HeroCTA";
import { ProductMockup } from "./ProductMockup";

export function Hero() {
  return (
    <section className="bg-[#1a1a1a] pt-12 pb-14 md:pt-20 md:pb-24">
      <div className="max-w-3xl mx-auto px-5 text-center">
        <h1 className="text-[2.25rem] md:text-6xl font-extrabold text-[#e0e0e0] leading-[1.1] tracking-tight">
          Stop Winging{" "}
          <span className="text-[#4A7AFF]">Sales Interviews</span>
        </h1>

        <p className="text-lg md:text-xl text-[#999] mt-5 max-w-xl mx-auto leading-relaxed">
          AI-powered prep kits for SDR, BDR &amp; AE candidates. Company-specific
          questions. Mock cold call practice. Walk in confident.
        </p>

        <div id="hero-cta" className="mt-8">
          <HeroCTA />
        </div>

        {/* Social proof */}
        <p className="text-sm text-[#777] mt-6">
          Used by SDR candidates at Salesforce, HubSpot, Datadog &amp; 50+ companies
        </p>

        {/* Product mockup */}
        <div className="mt-12 max-w-2xl mx-auto">
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}
