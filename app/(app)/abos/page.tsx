import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubscriptionFilters } from "@/components/subscriptions/subscription-filters";

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

  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order");

  let query = supabase
    .from("subscriptions")
    .select(
      "id, name, amount, billing_interval, status, next_billing_date, categories(name, color, sort_order)"
    );

  if (search) query = query.ilike("name", `%${search}%`);
  if (kategorie) query = query.eq("category_id", kategorie);

  if (status === "all") {
    // no status filter — show every status
  } else if (status === "active" || status === "paused" || status === "cancelled") {
    query = query.eq("status", status);
  } else {
    query = query.neq("status", "cancelled");
  }

  const { data: subscriptions, error } = await query
    .order("next_billing_date", { ascending: true, nullsFirst: false })
    .order("name");

  const grouped = new Map<
    string,
    { color: string | null; sortOrder: number; items: NonNullable<typeof subscriptions> }
  >();

  for (const sub of subscriptions ?? []) {
    const categoryName = sub.categories?.name ?? "Ohne Kategorie";
    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, {
        color: sub.categories?.color ?? null,
        sortOrder: sub.categories?.sort_order ?? 999,
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
        categories={categories ?? []}
        initialQ={search}
        initialStatus={status}
        initialKategorie={kategorie}
      />

      {error && <p className="text-sm text-red-600">{error.message}</p>}

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
                    {sub.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € ·{" "}
                    {INTERVAL_LABELS[sub.billing_interval] ?? sub.billing_interval}
                    {sub.next_billing_date && (
                      <span
                        className={
                          sub.status === "active" && sub.next_billing_date < todayStr
                            ? "font-medium text-destructive"
                            : ""
                        }
                      >
                        {" · nächste: "}
                        {new Date(sub.next_billing_date).toLocaleDateString("de-DE")}
                        {sub.status === "active" &&
                          sub.next_billing_date < todayStr &&
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
