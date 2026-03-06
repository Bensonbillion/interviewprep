import { FinalCTAButton } from "./FinalCTAButton";

export function FinalCTA() {
  return (
    <section className="bg-gradient-to-br from-[#1E3A5F] to-[#4A7AFF] py-14 md:py-20">
      <div className="max-w-[1120px] mx-auto px-5 text-center">
        <h2 className="text-2xl md:text-4xl font-bold text-white">
          Your Interview Could Be Tomorrow.
        </h2>
        <p className="text-base text-blue-200 mt-3 max-w-md mx-auto leading-relaxed">
          Start prepping tonight &mdash; it takes 2 minutes.
        </p>
        <div className="mt-7">
          <FinalCTAButton />
        </div>
        <p className="mt-3 text-sm text-blue-200/70">
          Free &middot; No credit card &middot; Works on mobile
        </p>
      </div>
    </section>
  );
}
