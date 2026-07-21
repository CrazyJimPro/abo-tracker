import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { markBilled } from "@/lib/actions/subscriptions";
import { Button } from "@/components/ui/button";

const CONTAINER =
  "divide-y divide-white/40 rounded-lg border border-white/40 bg-white/40 shadow-lg shadow-black/5 backdrop-blur-xl dark:divide-white/10 dark:border-white/10 dark:bg-white/5";

function dayLabel(diff: number) {
  if (diff < 0) {
    const n = Math.abs(diff);
    return `überfällig seit ${n} Tag${n === 1 ? "" : "en"}`;
  }
  if (diff === 0) return "heute fällig";
  return `fällig in ${diff} Tag${diff === 1 ? "" : "en"}`;
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() + 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("subscriptions")
    .select("id, name, amount, next_billing_date")
    .eq("status", "active")
    .not("next_billing_date", "is", null)
    .lte("next_billing_date", cutoffStr)
    .order("next_billing_date", { ascending: true });

  const rows = data ?? [];
  const overdue = rows.filter((r) => r.next_billing_date! < todayStr);
  const dueSoon = rows.filter((r) => r.next_billing_date! >= todayStr);

  const { data: priceData } = await supabase
    .from("subscriptions")
    .select("id, name, amount, regular_amount, intro_until")
    .eq("status", "active")
    .not("regular_amount", "is", null)
    .gte("intro_until", todayStr)
    .lte("intro_until", cutoffStr)
    .order("intro_until", { ascending: true });
  const priceChanges = priceData ?? [];

  const todayMs = Date.parse(`${todayStr}T00:00:00Z`);
  const diffDays = (date: string) =>
    Math.round((Date.parse(`${date}T00:00:00Z`) - todayMs) / 86400000);

  const renderRow = (r: (typeof rows)[number]) => (
    <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <Link href={`/abos/${r.id}`} className="text-sm font-medium hover:underline">
          {r.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {r.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € ·{" "}
          {new Date(r.next_billing_date!).toLocaleDateString("de-DE")} ·{" "}
          {dayLabel(diffDays(r.next_billing_date!))}
        </p>
      </div>
      <form action={markBilled.bind(null, r.id)}>
        <Button type="submit" variant="secondary" size="sm">
          Abgerechnet
        </Button>
      </form>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Benachrichtigungen</h1>

      {rows.length === 0 && priceChanges.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Alles erledigt – keine anstehenden Fälligkeiten.
        </p>
      )}

      {overdue.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-destructive">Überfällig ({overdue.length})</h2>
          <div className={CONTAINER}>{overdue.map(renderRow)}</div>
        </section>
      )}

      {dueSoon.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Fällig in den nächsten 7 Tagen ({dueSoon.length})
          </h2>
          <div className={CONTAINER}>{dueSoon.map(renderRow)}</div>
        </section>
      )}

      {priceChanges.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Preiswechsel in den nächsten 7 Tagen ({priceChanges.length})
          </h2>
          <div className={CONTAINER}>
            {priceChanges.map((r) => {
              const d = diffDays(r.intro_until!);
              const when = d === 0 ? "heute" : `in ${d} Tag${d === 1 ? "" : "en"}`;
              return (
                <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/abos/${r.id}`} className="text-sm font-medium hover:underline">
                      {r.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {r.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €{" → "}
                      {r.regular_amount!.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € ab{" "}
                      {new Date(r.intro_until!).toLocaleDateString("de-DE")} · {when}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
