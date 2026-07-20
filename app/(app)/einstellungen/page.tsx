import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/settings/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Profil</CardTitle>
          <CardDescription>Dein Anzeigename erscheint in der Begrüßung.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" defaultValue={user?.email ?? ""} disabled />
          </div>
          <ProfileForm defaultDisplayName={profile?.display_name ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
