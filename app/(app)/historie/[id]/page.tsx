import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getPriceHistoryForSubscription, getSubscription } from "@/lib/db/queries";
import { PriceChart } from "@/components/history/price-chart";
import { ManualEntryForm } from "@/components/history/manual-entry-form";
import { PriceHistoryRow } from "@/components/history/price-history-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatEuro(value: number) {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Price that was in effect at `cutoff`: the most recent entry on or before
// that date. Returns null if the earliest known entry is more recent than
// `cutoff` (subscription too young, or history not tracked back that far).
function priceAsOf(entries: { changedAt: string; amount: number }[], cutoff: string) {
  let result: { changedAt: string; amount: number } | null = null;
  for (const entry of entries) {
    if (entry.changedAt <= cutoff) result = entry;
  }
  return result;
}

export default async function PriceHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const subscription = getSubscription(user.id, id);
  if (!subscription) notFound();

  const entries = getPriceHistoryForSubscription(user.id, id);

  const today = new Date();
  const twelveMonthsAgo = new Date(today);
  twelveMonthsAgo.setUTCFullYear(twelveMonthsAgo.getUTCFullYear() - 1);
  const cutoffStr = twelveMonthsAgo.toISOString().slice(0, 10);

  const currentAmount = entries.length > 0 ? entries[entries.length - 1].amount : subscription.amount;
  const pastEntry = priceAsOf(entries, cutoffStr);
  const changePct =
    pastEntry && pastEntry.amount > 0
      ? ((currentAmount - pastEntry.amount) / pastEntry.amount) * 100
      : null;

  const chartData = entries.map((e) => ({ date: e.changedAt, amount: e.amount }));

  return (
    <div className="space-y-6">
      <Link
        href="/historie"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Historie
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {subscription.name}
            <Badge variant={subscription.status === "cancelled" ? "outline" : "success"}>
              {subscription.status === "active"
                ? "Aktiv"
                : subscription.status === "paused"
                  ? "Pausiert"
                  : "Gekündigt"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Aktuell</p>
              <p className="text-xl font-semibold">{formatEuro(currentAmount)} €</p>
            </div>
            {pastEntry ? (
              <div>
                <p className="text-xs text-muted-foreground">Vor 12 Monaten</p>
                <p className="text-xl font-semibold">
                  {formatEuro(pastEntry.amount)} €
                  {changePct !== null && (
                    <span
                      className={`ml-2 align-middle text-sm font-medium ${
                        changePct > 0
                          ? "text-destructive"
                          : changePct < 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {changePct > 0 ? "+" : ""}
                      {changePct.toLocaleString("de-DE", { maximumFractionDigits: 1 })}%
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Noch keine Preisdaten von vor 12 Monaten — trage einen alten Preis nach, um den
                Verlauf zu vervollständigen.
              </p>
            )}
          </div>

          {chartData.length > 1 ? (
            <PriceChart data={chartData} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch zu wenige Datenpunkte für ein Diagramm.
            </p>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Preispunkte</h3>
            <div className="divide-y divide-white/40 rounded-lg border border-white/40 bg-white/40 backdrop-blur-xl dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
              {[...entries].reverse().map((entry, idx, arr) => {
                const prev = arr[idx + 1];
                const delta = prev && prev.amount > 0 ? ((entry.amount - prev.amount) / prev.amount) * 100 : null;
                return (
                  <PriceHistoryRow key={entry.id} subscriptionId={id} entry={entry} deltaPct={delta} />
                );
              })}
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium">Alten Preis nachtragen</h3>
            <ManualEntryForm subscriptionId={id} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
