"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const check = () => {
      // Show after scrolling past ~viewport height, hide when hero CTA is visible
      const heroCTA = document.getElementById("hero-cta");
      if (heroCTA) {
        const rect = heroCTA.getBoundingClientRect();
        setVisible(rect.bottom < 0);
      } else {
        setVisible(window.scrollY > 500);
      }
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(check);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden
                  bg-[#1a1a1a]/95 backdrop-blur-sm border-t border-[#2a2a2a]
                  px-4 py-2.5 safe-area-pb transition-transform duration-300
                  ${visible ? "translate-y-0" : "translate-y-full"}`}
      style={{ height: 60 }}
    >
      <Link
        href="/get-started"
        className="block w-full bg-[#FF6B4A] hover:bg-[#E85D3A] text-white
                   text-center font-semibold py-3 rounded-full text-sm
                   transition-colors duration-200 min-h-[44px]"
      >
        Start practicing free &rarr;
      </Link>
    </div>
  );
}
