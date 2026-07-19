import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminPage() {
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

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, must_change_password, created_at")
    .order("created_at");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Userverwaltung</h1>
        <p className="text-sm text-muted-foreground">
          Neue Accounts anlegen und Passwörter zurücksetzen.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Neuen User anlegen</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>

      <div className="divide-y rounded-lg border bg-white">
        {(profiles ?? []).map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{p.display_name ?? p.email}</p>
              <p className="text-xs text-muted-foreground">{p.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.role === "admin" ? "default" : "secondary"}>{p.role}</Badge>
              {p.must_change_password && <Badge variant="outline">Passwort-Änderung ausstehend</Badge>}
              {p.id !== user!.id && <ResetPasswordButton userId={p.id} />}
            </div>
          </div>
        ))}
        {(!profiles || profiles.length === 0) && (
          <p className="px-4 py-6 text-sm text-muted-foreground">Keine User gefunden.</p>
        )}
      </div>
    </div>
  );
}
