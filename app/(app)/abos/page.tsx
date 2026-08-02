import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { listSubscriptions, listVisibleCategories } from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubscriptionFilters } from "@/components/subscriptions/subscription-filters";
import { effectiveAmount, promoActive } from "@/lib/pricing";

const INTERVAL_LABELS: Record<string, string> = {
  weekly: "wöchentlich",
  monthly: "monatlich",
  quarterly: "vierteljährlich",
  yearly: "jährlich",
};

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

export default async function SubscriptionsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; kategorie?: string }>;
}) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const kategorie = params.kategorie ?? "";
  const hasFilters = Boolean(search || status || kategorie);

  const user = await requireUser();

  const categories = listVisibleCategories(user.id);
  const subscriptions = listSubscriptions(user.id, {
    search,
    status,
    categoryId: kategorie,
  });

  const grouped = new Map<
    string,
    { color: string | null; sortOrder: number; items: typeof subscriptions }
  >();

  for (const sub of subscriptions) {
    const categoryName = sub.categoryName ?? "Ohne Kategorie";
    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, {
        color: sub.categoryColor ?? null,
        sortOrder: sub.categorySortOrder ?? 999,
        items: [],
      });
    }
    grouped.get(categoryName)!.items.push(sub);
  }

  const sortedGroups = [...grouped.entries()].sort((a, b) => a[1].sortOrder - b[1].sortOrder);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Abos</h1>
        <Button render={<Link href="/abos/neu" />} nativeButton={false}>
          Neues Abo
        </Button>
      </div>

      <SubscriptionFilters
        categories={categories}
        initialQ={search}
        initialStatus={status}
        initialKategorie={kategorie}
      />

      {sortedGroups.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {hasFilters
            ? "Keine Abos gefunden."
            : "Noch keine Abos erfasst. Lege dein erstes Abo an."}
        </p>
      )}

      {sortedGroups.map(([categoryName, group]) => (
        <div key={categoryName} className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {group.color && (
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: group.color }}
              />
            )}
            {categoryName}
          </h2>
          <div className="divide-y divide-white/40 rounded-lg border border-white/40 bg-white/40 shadow-lg shadow-black/5 backdrop-blur-xl dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
            {group.items.map((sub) => (
              <Link
                key={sub.id}
                href={`/abos/${sub.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/30 dark:hover:bg-white/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{sub.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {effectiveAmount(sub, todayStr).toLocaleString("de-DE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    € · {INTERVAL_LABELS[sub.billingInterval] ?? sub.billingInterval}
                    {promoActive(sub, todayStr) &&
                      ` · Aktion bis ${new Date(sub.introUntil!).toLocaleDateString("de-DE")}`}
                    {sub.nextBillingDate && (
                      <span
                        className={
                          sub.status === "active" && sub.nextBillingDate < todayStr
                            ? "font-medium text-destructive"
                            : ""
                        }
                      >
                        {" · nächste: "}
                        {new Date(sub.nextBillingDate).toLocaleDateString("de-DE")}
                        {sub.status === "active" &&
                          sub.nextBillingDate < todayStr &&
                          " (überfällig)"}
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[sub.status] ?? "outline"}>
                  {STATUS_LABELS[sub.status] ?? sub.status}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
