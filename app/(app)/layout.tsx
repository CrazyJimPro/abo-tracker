import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { countNotifications } from "@/lib/db/queries";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { UpdateBadge } from "@/components/layout/update-badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CURRENT_VERSION } from "@/lib/version";
import { BellIcon } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() + 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const notifCount = countNotifications(user.id, todayStr, cutoffStr);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="bg-gradient-to-r from-(--primary-gradient-from) to-(--primary-gradient-to) bg-clip-text text-lg font-extrabold text-transparent"
            >
              Abo-Tracker
            </Link>
            <a
              href="https://github.com/CrazyJimPro/abo-tracker/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              v{CURRENT_VERSION}
            </a>
            <Suspense fallback={null}>
              <UpdateBadge />
            </Suspense>
            <Link href="/abos" className="text-sm text-muted-foreground hover:text-foreground">
              Abos
            </Link>
            <Link
              href="/einstellungen"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Einstellungen
            </Link>
            {user.role === "admin" && (
              <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
                Admin
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/benachrichtigungen"
              aria-label="Benachrichtigungen"
              className="relative inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50"
            >
              <BellIcon className="size-4" />
              {notifCount ? (
                <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-medium text-white">
                  {notifCount}
                </span>
              ) : null}
            </Link>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Abmelden
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
