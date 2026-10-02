import React from "react";

interface PonmaniLogoProps {
  variant?: "color" | "bw" | "icon";
  className?: string;
  style?: React.CSSProperties;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Official Ponmani Agencies Brand Logo Component
 * Displays the circular PA logo monogram icon + clean, crisp typography text.
 */
export function PonmaniLogo({
  variant = "color",
  className = "",
  style,
  showText = true,
  size = "md",
}: PonmaniLogoProps) {
  // Icon dimensions
  const iconHeightClass =
    size === "sm" ? "h-8" : size === "lg" ? "h-16" : "h-12";

  if (variant === "icon" || !showText) {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`} style={style}>
        <img
          src="/ponmani-pa-logo.png"
          alt="PA Monogram"
          className={`${iconHeightClass} w-auto object-contain shrink-0`}
        />
      </div>
    );
  }

  if (variant === "bw") {
    // Pure Black B&W for 80mm Thermal Printer receipts
    return (
      <div className={`flex flex-col items-center justify-center text-center text-black shrink-0 ${className}`} style={style}>
        <img
          src="/ponmani-pa-logo-bw.png"
          alt="PA Monogram"
          className={`${iconHeightClass} w-auto object-contain mx-auto mb-1 shrink-0`}
        />
        <div className="font-serif font-black text-sm tracking-[0.2em] uppercase text-black leading-none">
          PONMANI
        </div>
        <div className="text-[9px] font-sans font-bold tracking-[0.25em] text-black uppercase mt-0.5">
          — AGENCIES —
        </div>
        <div className="text-[7.5px] font-sans font-semibold tracking-[0.15em] text-black uppercase mt-0.5">
          SINCE 1998
        </div>
      </div>
    );
  }

  // Full Color UI & A4 Print Header
  return (
    <div className={`inline-flex items-center gap-3 shrink-0 ${className}`} style={style}>
      <img
        src="/ponmani-pa-logo.png"
        alt="PA Monogram Logo"
        className={`${iconHeightClass} w-auto object-contain shrink-0 drop-shadow-xs`}
      />
      {showText && (
        <div className="flex flex-col items-center justify-center text-center leading-none gap-1 shrink-0">
          <span className="font-serif font-black text-slate-900 tracking-[0.18em] uppercase text-base sm:text-lg leading-none">
            PONMANI
          </span>
          <span className="text-[10px] sm:text-[11px] font-sans font-bold text-amber-600 tracking-[0.25em] uppercase leading-none">
            — AGENCIES —
          </span>
          <span className="text-[8px] sm:text-[9px] font-sans font-semibold text-slate-500 tracking-[0.2em] uppercase leading-none">
            SINCE 1998
          </span>
        </div>
      )}
    </div>
  );
}
