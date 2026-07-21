import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function CategoriesListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (currentProfile?.role !== "admin") redirect("/");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, color, sort_order")
    .is("owner_id", null)
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kategorien</h1>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            ← Userverwaltung
          </Link>
        </div>
        <Button render={<Link href="/admin/kategorien/neu" />} nativeButton={false}>
          Neue Kategorie
        </Button>
      </div>

      {(!categories || categories.length === 0) && (
        <p className="text-sm text-muted-foreground">Noch keine Kategorien angelegt.</p>
      )}

      <div className="divide-y divide-white/40 rounded-lg border border-white/40 bg-white/40 shadow-lg shadow-black/5 backdrop-blur-xl dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
        {(categories ?? []).map((c) => (
          <Link
            key={c.id}
            href={`/admin/kategorien/${c.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-white/30 dark:hover:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: c.color ?? "#94A3B8" }}
              />
              <p className="text-sm font-medium">{c.name}</p>
            </div>
            <p className="text-xs text-muted-foreground">Sortierung {c.sort_order}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
