import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="bg-[#F7F5F0] py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-5 text-center">
        <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] leading-tight">
          Your interview could be tomorrow.
        </h2>
        <p className="text-lg md:text-xl text-[#6B6560] mt-4 max-w-md mx-auto leading-relaxed font-sans">
          Start prepping tonight &mdash; it takes 2 minutes.
        </p>
        <div className="mt-8">
          <Link
            href="/get-started"
            className="inline-flex items-center justify-center
                       bg-[#E8735A] hover:bg-[#D4614A] text-white
                       px-8 py-4 text-lg font-medium rounded-full
                       shadow-md hover:shadow-lg transition-all duration-300 min-h-[52px]"
          >
            Start prepping &mdash; it&apos;s free &rarr;
          </Link>
        </div>
        <p className="mt-4 text-sm text-[#9C9590] font-sans">
          Free &middot; No credit card &middot; Works on mobile
        </p>
      </div>
    </section>
  );
}
