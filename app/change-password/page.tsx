import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default function ChangePasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Passwort ändern</CardTitle>
          <CardDescription>
            Aus Sicherheitsgründen musst du dein Passwort beim ersten Login ändern.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
