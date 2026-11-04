"use client";

import { createMemberUser, type CreateUserState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormMessage } from "@/components/forms/field-error";
import { useFieldForm } from "@/components/forms/use-field-form";

const initialState: CreateUserState = { error: null, result: null };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateUserForm() {
  const { isPending, errors, result, formMessage, formProps, invalid, labelClass } =
    useFieldForm<CreateUserState>({
      action: (formData) => createMemberUser(initialState, formData),
      validate: (formData): Record<string, string> => {
        const email = (formData.get("email") as string)?.trim() ?? "";
        if (!email) return { email: "E-Mail ist erforderlich." };
        if (!EMAIL_PATTERN.test(email)) return { email: "Bitte eine gültige E-Mail-Adresse angeben." };
        return {};
      },
      // Felder leeren, das temporäre Passwort steht darunter.
      onSuccess: (_result, form) => form.reset(),
    });

  return (
    <div className="space-y-4">
      <form {...formProps} className="flex flex-wrap items-start gap-3">
        <div className="space-y-2">
          <Label htmlFor="email" className={labelClass("email")}>
            E-Mail
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            aria-invalid={invalid("email")}
            placeholder="name@beispiel.de"
          />
          <FieldError message={errors.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Anzeigename</Label>
          <Input id="display_name" name="display_name" placeholder="z. B. Sam" />
        </div>
        <Button type="submit" disabled={isPending} className="mt-[22px]">
          {isPending ? "Anlegen…" : "User anlegen"}
        </Button>
      </form>

      <FormMessage message={formMessage} />

      {result?.result && (
        <div className="max-w-md rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-medium">User angelegt: {result.result.email}</p>
          <p className="mt-1">
            Temporäres Passwort:{" "}
            <span className="font-mono font-medium">{result.result.tempPassword}</span>
          </p>
          <p className="mt-1 text-muted-foreground">
            Wird nur einmal angezeigt. Muss beim ersten Login geändert werden.
          </p>
        </div>
      )}
    </div>
  );
}
