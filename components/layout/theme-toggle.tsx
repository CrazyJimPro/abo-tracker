"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon, GemIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEMES = ["light", "dark", "midnight"] as const;
type ThemeName = (typeof THEMES)[number];

const ICONS: Record<ThemeName, typeof SunIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  midnight: GemIcon,
};
const LABELS: Record<ThemeName, string> = {
  light: "Helles Design",
  dark: "Dunkles Design",
  midnight: "Mitternachts-Design (Navy/Gold)",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Der Server kennt die per localStorage gespeicherte Wahl nicht - das ist
  // next-themes' eigenes, dokumentiertes Muster gegen einen Hydration-
  // Mismatch, keine Effect-Alternative dafuer.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="size-7" aria-hidden />;
  }

  const current: ThemeName = THEMES.includes(theme as ThemeName) ? (theme as ThemeName) : "dark";
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  const Icon = ICONS[current];

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      type="button"
      title={LABELS[current]}
      aria-label={`Zu "${LABELS[next]}" wechseln`}
      onClick={() => setTheme(next)}
    >
      <Icon className="size-4" />
    </Button>
  );
}
