"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError, FormMessage } from "@/components/forms/field-error";
import { useFieldForm } from "@/components/forms/use-field-form";
import type { ActionState } from "@/lib/actions/subscriptions";
import {
  NOTICE_UNITS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  readSubscriptionFields,
  validateFields,
} from "@/lib/subscription-validation";
import { NOTICE_UNIT_LABELS, cancelByDate } from "@/lib/contract";

const initialState: ActionState = { error: null };

const BILLING_INTERVAL_OPTIONS = [
  { value: "weekly", label: "Wöchentlich" },
  { value: "monthly", label: "Monatlich" },
  { value: "quarterly", label: "Vierteljährlich" },
  { value: "yearly", label: "Jährlich" },
];

const NOTICE_UNIT_OPTIONS = NOTICE_UNITS.map((u) => ({ value: u, label: NOTICE_UNIT_LABELS[u] }));

const PAYMENT_METHOD_OPTIONS = [
  { value: "none", label: "Keine Angabe" },
  ...PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })),
];

const STATUS_OPTIONS = [
  { value: "active", label: "Aktiv" },
  { value: "paused", label: "Pausiert" },
  { value: "cancelled", label: "Gekündigt" },
];

type CategoryOption = { id: string; name: string };

export function SubscriptionForm({
  action,
  duplicateAction,
  categories,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  duplicateAction?: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  categories: CategoryOption[];
  defaultValues?: {
    name: string;
    amount: number;
    billingInterval: string;
    status: string;
    categoryId: string | null;
    nextBillingDate: string | null;
    notes: string | null;
    regularAmount: number | null;
    introUntil: string | null;
    contractEnd: string | null;
    noticePeriod: number | null;
    noticeUnit: string | null;
    paymentMethod: string | null;
  };
  submitLabel: string;
}) {
  const [categoryValue, setCategoryValue] = useState(defaultValues?.categoryId ?? "none");
  const isNewCategory = categoryValue === "__new__";
  // Nur für den Hinweis "spätestens kündigen bis …" unter den Vertragsfeldern.
  const [contractEnd, setContractEnd] = useState(defaultValues?.contractEnd ?? "");
  const [noticePeriod, setNoticePeriod] = useState(
    defaultValues?.noticePeriod != null ? String(defaultValues.noticePeriod) : ""
  );
  const [noticeUnit, setNoticeUnit] = useState(defaultValues?.noticeUnit ?? "months");
  const noticeNumber = Number(noticePeriod);
  const cancelBy =
    contractEnd && (!noticePeriod || Number.isInteger(noticeNumber))
      ? cancelByDate(contractEnd, noticePeriod ? noticeNumber : null, noticeUnit)
      : null;
  // Damit im geschlossenen Feld der Name steht und nicht die id.
  const categoryItems = [
    { value: "none", label: "Keine" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
    { value: "__new__", label: "+ Neue Kategorie…" },
  ];

  const { isPending, pendingAction, errors, formMessage, formProps, clearError, invalid, labelClass } =
    useFieldForm<ActionState>({
      action: (formData, submitter) => {
        const submit =
          submitter?.dataset.action === "duplicate" && duplicateAction ? duplicateAction : action;
        return submit(initialState, formData);
      },
      validate: (formData) => {
        const found: Record<string, string> = validateFields(readSubscriptionFields(formData));
        if (isNewCategory && !(formData.get("new_category_name") as string)?.trim()) {
          found.new_category_name = "Bitte einen Namen für die neue Kategorie angeben.";
        }
        return found;
      },
      // Nur Speichern kommt mit Erfolg zurück; Anlegen und Duplizieren leiten weiter.
      onSuccess: () => toast.success("Gespeichert"),
    });

  return (
    <form {...formProps} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className={labelClass("name")}>
          Name
        </Label>
        <Input
          id="name"
          name="name"
          required
          aria-invalid={invalid("name")}
          defaultValue={defaultValues?.name}
          placeholder="z. B. Netflix"
        />
        <FieldError message={errors.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount" className={labelClass("amount")}>
            Betrag (€)
          </Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            aria-invalid={invalid("amount")}
            defaultValue={defaultValues?.amount}
            placeholder="9.99"
          />
          <FieldError message={errors.amount} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing_interval">Intervall</Label>
          <Select
            name="billing_interval"
            items={BILLING_INTERVAL_OPTIONS}
            defaultValue={defaultValues?.billingInterval ?? "monthly"}
          >
            <SelectTrigger
              id="billing_interval"
              className="w-full"
              aria-invalid={invalid("billing_interval")}
            >
              <SelectValue placeholder="Intervall wählen" />
            </SelectTrigger>
            <SelectContent>
              {BILLING_INTERVAL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.billing_interval} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            name="status"
            items={STATUS_OPTIONS}
            defaultValue={defaultValues?.status ?? "active"}
          >
            <SelectTrigger id="status" className="w-full" aria-invalid={invalid("status")}>
              <SelectValue placeholder="Status wählen" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.status} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category_id">Kategorie</Label>
          <Select
            name="category_id"
            items={categoryItems}
            value={categoryValue}
            onValueChange={(v) => {
              setCategoryValue(v ?? "none");
              clearError("new_category_name");
            }}
          >
            <SelectTrigger id="category_id" className="w-full">
              <SelectValue placeholder="Kategorie wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Keine</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
              <SelectItem value="__new__">+ Neue Kategorie…</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isNewCategory && (
        <div className="space-y-2">
          <Label htmlFor="new_category_name" className={labelClass("new_category_name")}>
            Neue Kategorie
          </Label>
          <Input
            id="new_category_name"
            name="new_category_name"
            required
            autoFocus
            aria-invalid={invalid("new_category_name")}
            placeholder="z. B. Haushalt"
          />
          <FieldError message={errors.new_category_name} />
          <p className="text-xs text-muted-foreground">
            Wird als deine private Kategorie angelegt und nur dir angezeigt.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="next_billing_date" className={labelClass("next_billing_date")}>
            Nächste Abrechnung
          </Label>
          <Input
            id="next_billing_date"
            name="next_billing_date"
            type="date"
            aria-invalid={invalid("next_billing_date")}
            defaultValue={defaultValues?.nextBillingDate ?? ""}
          />
          <FieldError message={errors.next_billing_date} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment_method">Zahlungsart</Label>
          <Select
            name="payment_method"
            items={PAYMENT_METHOD_OPTIONS}
            defaultValue={defaultValues?.paymentMethod ?? "none"}
          >
            <SelectTrigger
              id="payment_method"
              className="w-full"
              aria-invalid={invalid("payment_method")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.payment_method} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="regular_amount" className={labelClass("regular_amount")}>
            Regulärer Preis (€)
          </Label>
          <Input
            id="regular_amount"
            name="regular_amount"
            type="number"
            step="0.01"
            min="0"
            aria-invalid={invalid("regular_amount")}
            defaultValue={defaultValues?.regularAmount ?? ""}
            placeholder="optional"
          />
          <FieldError message={errors.regular_amount} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intro_until" className={labelClass("intro_until")}>
            Aktionspreis gilt bis
          </Label>
          <Input
            id="intro_until"
            name="intro_until"
            type="date"
            aria-invalid={invalid("intro_until")}
            defaultValue={defaultValues?.introUntil ?? ""}
          />
          <FieldError message={errors.intro_until} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Optional: Zahlst du aktuell einen Aktionspreis, trage ihn oben als „Betrag“ ein und hier den
        regulären Preis samt Enddatum der Aktion. Ab dann wird automatisch mit dem regulären Preis
        gerechnet.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contract_end" className={labelClass("contract_end")}>
            Vertrag läuft bis
          </Label>
          <Input
            id="contract_end"
            name="contract_end"
            type="date"
            aria-invalid={invalid("contract_end")}
            defaultValue={defaultValues?.contractEnd ?? ""}
            onChange={(e) => setContractEnd(e.target.value)}
          />
          <FieldError message={errors.contract_end} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notice_period" className={labelClass("notice_period")}>
            Kündigungsfrist
          </Label>
          <div className="flex gap-2">
            <Input
              id="notice_period"
              name="notice_period"
              type="number"
              step="1"
              min="0"
              aria-invalid={invalid("notice_period")}
              defaultValue={defaultValues?.noticePeriod ?? ""}
              onChange={(e) => setNoticePeriod(e.target.value)}
              placeholder="z. B. 3"
              className="w-20"
            />
            <Select
              name="notice_unit"
              items={NOTICE_UNIT_OPTIONS}
              value={noticeUnit}
              onValueChange={(v) => setNoticeUnit(v ?? "months")}
            >
              <SelectTrigger
                aria-label="Einheit der Kündigungsfrist"
                className="min-w-0 flex-1"
                aria-invalid={invalid("notice_unit")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTICE_UNIT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FieldError message={errors.notice_period} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Optional: Mit Vertragsende und Frist erinnert dich die App rechtzeitig unter
        Benachrichtigungen, bevor sich der Vertrag verlängert.
        {cancelBy && (
          <>
            {" "}
            <span className="font-medium text-foreground">
              Spätestens kündigen bis {new Date(cancelBy).toLocaleDateString("de-DE")}.
            </span>
          </>
        )}
      </p>

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes ?? ""} rows={3} />
      </div>

      <FormMessage message={formMessage} />
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {pendingAction === "" ? "Speichern…" : submitLabel}
        </Button>
        {duplicateAction && (
          <Button type="submit" data-action="duplicate" variant="secondary" disabled={isPending}>
            {pendingAction === "duplicate" ? "Wird angelegt…" : "Duplizieren"}
          </Button>
        )}
      </div>
      {duplicateAction && (
        <p className="text-xs text-muted-foreground">
          Duplizieren legt ein neues Abo mit den obigen (auch geänderten) Werten an — das aktuelle
          bleibt unverändert erhalten.
        </p>
      )}
    </form>
  );
}
