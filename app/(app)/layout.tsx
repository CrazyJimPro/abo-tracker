import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BellIcon } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() + 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  let notifCount = 0;
  if (user) {
    const [{ count: dueCount }, { count: priceCount }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .not("next_billing_date", "is", null)
        .lte("next_billing_date", cutoffStr),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .not("regular_amount", "is", null)
        .gte("intro_until", todayStr)
        .lte("intro_until", cutoffStr),
    ]);
    notifCount = (dueCount ?? 0) + (priceCount ?? 0);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-6">
            <Link href="/" className="font-semibold">
              Abo-Tracker
            </Link>
            <Link href="/abos" className="text-sm text-muted-foreground hover:text-foreground">
              Abos
            </Link>
            <Link
              href="/einstellungen"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Einstellungen
            </Link>
            {profile?.role === "admin" && (
              <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
                Admin
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
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
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">{user?.email}</span>
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
