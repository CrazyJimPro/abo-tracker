import { requireUser } from "@/lib/auth/guards";
import { ProfileForm } from "@/components/settings/profile-form";
import { ImportForm } from "@/components/settings/import-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const user = await requireUser();

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
            <Input id="email" defaultValue={user.email} disabled />
          </div>
          <ProfileForm defaultDisplayName={user.displayName ?? ""} />
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Daten</CardTitle>
          <CardDescription>Abos als CSV sichern oder wiederherstellen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Export</p>
            <Button render={<a href="/api/export" />} nativeButton={false}>
              Als CSV exportieren
            </Button>
          </div>
          <ImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
