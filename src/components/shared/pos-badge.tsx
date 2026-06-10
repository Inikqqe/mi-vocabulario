"use client";

import { useTheme } from "next-themes";
import { PART_OF_SPEECH_COLORS, PART_OF_SPEECH_LABELS, type PartOfSpeech } from "@/types";

interface PosBadgeProps {
  pos: PartOfSpeech;
  className?: string;
}

export function PosBadge({ pos, className = "" }: PosBadgeProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = PART_OF_SPEECH_COLORS[pos];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-none ${className}`}
      style={{
        backgroundColor: isDark ? colors.darkBg : colors.bg,
        color: isDark ? colors.darkText : colors.text,
      }}
    >
      {PART_OF_SPEECH_LABELS[pos]}
    </span>
  );
}
