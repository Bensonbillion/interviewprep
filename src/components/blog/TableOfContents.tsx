"use client";

import { useEffect, useState } from "react";

interface Heading {
  text: string;
  id: string;
  level: number;
}

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav className="my-8 rounded-lg bg-[#131C31] border border-gray-800 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Table of contents
      </p>
      <ul className="space-y-1.5">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? "ml-4" : ""}>
            <a
              href={`#${h.id}`}
              className={`block text-sm transition-colors ${
                activeId === h.id
                  ? "text-blue-400 font-medium"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
