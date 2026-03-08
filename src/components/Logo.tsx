const SIZES = {
  sm: { icon: 28, text: "text-sm", gap: "gap-1.5" },
  md: { icon: 32, text: "text-lg", gap: "gap-2" },
  lg: { icon: 40, text: "text-xl", gap: "gap-2.5" },
} as const;

interface LogoProps {
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark";
}

function SMonogram({ size, theme }: { size: number; theme: "light" | "dark" }) {
  const bg = theme === "light" ? "#1A1A1A" : "#FDFCFA";
  const fg = theme === "light" ? "#FDFCFA" : "#1A1A1A";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" fill={bg} />
      <text
        x="12"
        y="36"
        fontFamily="'DM Serif Display', serif"
        fontSize="34"
        fill={fg}
      >
        S
      </text>
      <circle cx="36" cy="14" r="5" fill="#E8735A" />
    </svg>
  );
}

export function LogoIcon({ size = "md", theme = "light" }: LogoProps) {
  return <SMonogram size={SIZES[size].icon} theme={theme} />;
}

export function LogoWordmark({ size = "md", theme = "light" }: LogoProps) {
  const color = theme === "light" ? "text-[#1A1A1A]" : "text-[#FDFCFA]";
  return (
    <span className={`${SIZES[size].text} ${color} inline-flex items-baseline`}>
      <span className="font-serif">SalesPrep</span>
      <span className="font-sans font-medium text-[#E8735A] ml-1">AI</span>
    </span>
  );
}

export function LogoFull({ size = "md", theme = "light" }: LogoProps) {
  return (
    <span className={`inline-flex items-center ${SIZES[size].gap}`}>
      <LogoIcon size={size} theme={theme} />
      <LogoWordmark size={size} theme={theme} />
    </span>
  );
}
