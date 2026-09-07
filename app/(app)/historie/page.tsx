import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { listSubscriptions } from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";
import { effectiveAmount } from "@/lib/pricing";

const STATUS_VARIANT: Record<string, "success" | "warning" | "outline"> = {
  active: "success",
  paused: "warning",
  cancelled: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  paused: "Pausiert",
  cancelled: "Gekündigt",
};

export default async function HistoriePage() {
  const user = await requireUser();

  // No status filter: the Historie tab is meant to show every subscription
  // the user ever had, active or not, so past price increases stay visible
  // even after cancelling.
  const subscriptions = listSubscriptions(user.id, {});
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Historie</h1>
        <p className="text-sm text-muted-foreground">
          Preisverlauf all deiner Abos — aktuelle und vergangene.
        </p>
      </div>

      {subscriptions.length === 0 && (
        <p className="text-sm text-muted-foreground">Noch keine Abos erfasst.</p>
      )}

      <div className="divide-y divide-white/40 rounded-lg border border-white/40 bg-white/40 shadow-lg shadow-black/5 backdrop-blur-xl dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
        {subscriptions.map((sub) => (
          <Link
            key={sub.id}
            href={`/historie/${sub.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/30 dark:hover:bg-white/10"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{sub.name}</p>
              <p className="text-xs text-muted-foreground">
                {effectiveAmount(sub, todayStr).toLocaleString("de-DE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                € aktuell
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[sub.status] ?? "outline"}>
              {STATUS_LABELS[sub.status] ?? sub.status}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
