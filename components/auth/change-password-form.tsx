"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { changePassword, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormMessage } from "@/components/forms/field-error";
import { useFieldForm } from "@/components/forms/use-field-form";

const initialState: ActionState = { error: null };

export function ChangePasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const { isPending, errors, formMessage, formProps, invalid, labelClass } =
    useFieldForm<ActionState>({
      action: (formData) => changePassword(initialState, formData),
      validate: (formData) => {
        const password = (formData.get("password") as string) ?? "";
        const passwordConfirm = (formData.get("passwordConfirm") as string) ?? "";
        const found: Record<string, string> = {};
        if (password.length < 8) {
          found.password = "Das Passwort muss mindestens 8 Zeichen lang sein.";
        }
        if (password !== passwordConfirm) {
          found.passwordConfirm = "Die Passwörter stimmen nicht überein.";
        }
        return found;
      },
    });

  return (
    <form {...formProps} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password" className={labelClass("password")}>
          Neues Passwort
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
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
      <div className="space-y-2">
        <Label htmlFor="passwordConfirm" className={labelClass("passwordConfirm")}>
          Neues Passwort bestätigen
        </Label>
        <div className="relative">
          <Input
            id="passwordConfirm"
            name="passwordConfirm"
            type={showPasswordConfirm ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={invalid("passwordConfirm")}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setShowPasswordConfirm((prev) => !prev)}
            aria-label={showPasswordConfirm ? "Passwort verbergen" : "Passwort anzeigen"}
          >
            {showPasswordConfirm ? <EyeOff /> : <Eye />}
          </Button>
        </div>
        <FieldError message={errors.passwordConfirm} />
      </div>
      <FormMessage message={formMessage} />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Speichern…" : "Passwort ändern"}
      </Button>
    </form>
  );
}
