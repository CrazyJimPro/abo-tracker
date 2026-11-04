"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormMessage } from "@/components/forms/field-error";
import { useFieldForm } from "@/components/forms/use-field-form";

const initialState: ActionState = { error: null };

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { isPending, errors, formMessage, formProps, invalid, labelClass } =
    useFieldForm<ActionState>({
      action: (formData) => signIn(initialState, formData),
      validate: (formData) => {
        const found: Record<string, string> = {};
        if (!(formData.get("email") as string)?.trim()) found.email = "Bitte die E-Mail angeben.";
        if (!formData.get("password")) found.password = "Bitte das Passwort angeben.";
        return found;
      },
    });

  return (
    <form {...formProps} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className={labelClass("email")}>
          E-Mail
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={invalid("email")}
        />
        <FieldError message={errors.email} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className={labelClass("password")}>
          Passwort
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            aria-invalid={invalid("password")}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
        <FieldError message={errors.password} />
      </div>
      <FormMessage message={formMessage} />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Anmelden…" : "Anmelden"}
      </Button>
    </form>
  );
}
