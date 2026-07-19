import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Abo-Tracker</CardTitle>
          <CardDescription>Melde dich mit deinem Account an.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
