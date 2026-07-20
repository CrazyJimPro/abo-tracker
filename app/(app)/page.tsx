import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

const MONTHLY_FACTOR: Record<Enums<"billing_interval">, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user!.id)
    .single();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, name, amount, billing_interval, next_billing_date, categories(name, color)")
    .eq("status", "active")
    .order("next_billing_date", { ascending: true, nullsFirst: false });

  const active = subscriptions ?? [];
  const monthlyTotal = active.reduce((sum, s) => sum + s.amount * MONTHLY_FACTOR[s.billing_interval], 0);
  const upcoming = active.filter((s) => s.next_billing_date).slice(0, 5);

  const byCategory = new Map<string, { name: string; color: string; value: number }>();
  for (const s of active) {
    const name = s.categories?.name ?? "Ohne Kategorie";
    const color = s.categories?.color ?? "#94a3b8";
    const monthly = s.amount * MONTHLY_FACTOR[s.billing_interval];
    const entry = byCategory.get(name);
    if (entry) entry.value += monthly;
    else byCategory.set(name, { name, color, value: monthly });
  }
  const chartData = [...byCategory.values()].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Willkommen{profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Rolle: {profile?.role ?? "unbekannt"}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monatliche Kosten</CardTitle>
            <CardDescription>Hochgerechnet aus {active.length} aktiven Abo(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {monthlyTotal.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nächste Fälligkeiten</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine Abos mit hinterlegtem Abrechnungsdatum.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">
                      {new Date(s.next_billing_date!).toLocaleDateString("de-DE")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ausgaben nach Kategorie</CardTitle>
            <CardDescription>Monatlich normalisiert</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={chartData} />
          </CardContent>
        </Card>
      )}

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Noch keine Abos angelegt.{" "}
          <Link href="/abos/neu" className="text-foreground underline underline-offset-2">
            Jetzt erstes Abo anlegen
          </Link>
          .
        </p>
      ) : (
        <Link href="/abos" className="text-sm text-muted-foreground hover:text-foreground">
          Alle Abos ansehen →
        </Link>
      )}
    </div>
  );
}
