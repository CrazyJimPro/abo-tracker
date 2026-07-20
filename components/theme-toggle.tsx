"use client";

import { useTheme } from "next-themes";
import { SunIcon, MoonIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Both icons are always rendered; the active one is chosen purely via the
  // `.dark` class next-themes sets on <html> (before hydration), so there's
  // no state, no hydration mismatch, and no icon flash.
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Design umschalten"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="block dark:hidden" />
    </Button>
  );
}
