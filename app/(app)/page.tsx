import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="space-y-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Willkommen{profile?.display_name ? `, ${profile.display_name}` : ""}</CardTitle>
          <CardDescription>Rolle: {profile?.role ?? "unbekannt"}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Die Monatsübersicht kommt, sobald du deine ersten Abos angelegt hast.
        </CardContent>
      </Card>
    </div>
  );
}
