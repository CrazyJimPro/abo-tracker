import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { requireUser } from "@/lib/auth/guards";
import { listActiveSubscriptions } from "@/lib/db/queries";
import { markBilled } from "@/lib/actions/subscriptions";
import { monthlyAmount } from "@/lib/pricing";

export default async function Home() {
  const user = await requireUser();
  const active = listActiveSubscriptions(user.id);

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthlyTotal = active.reduce((sum, s) => sum + monthlyAmount(s, todayStr), 0);
  const upcoming = active.filter((s) => s.nextBillingDate).slice(0, 5);

  const byCategory = new Map<string, { name: string; color: string; value: number }>();
  for (const s of active) {
    const name = s.categoryName ?? "Ohne Kategorie";
    const color = s.categoryColor ?? "#94a3b8";
    const monthly = monthlyAmount(s, todayStr);
    const entry = byCategory.get(name);
    if (entry) entry.value += monthly;
    else byCategory.set(name, { name, color, value: monthly });
  }
  const chartData = [...byCategory.values()].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Willkommen{user.displayName ? `, ${user.displayName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Rolle: {user.role}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monatliche Kosten</CardTitle>
            <CardDescription>Hochgerechnet aus {active.length} aktiven Abo(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {monthlyTotal.toLocaleString("de-DE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
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
              <ul className="space-y-1">
                {upcoming.map((s) => {
                  const overdue = s.nextBillingDate! < todayStr;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      <span
                        className={overdue ? "font-medium text-destructive" : "text-muted-foreground"}
                      >
                        {new Date(s.nextBillingDate!).toLocaleDateString("de-DE")}
                        {overdue && " · überfällig"}
                      </span>
                      <form action={markBilled.bind(null, s.id)}>
                        <Button type="submit" variant="ghost" size="xs">
                          Abgerechnet
                        </Button>
                      </form>
                    </li>
                  );
                })}
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
