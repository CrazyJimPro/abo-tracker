"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateNotifyDays } from "@/lib/actions/profile";
import { NOTIFY_DAYS_OPTIONS } from "@/lib/notify-days";

// Speichert sofort beim Auswählen, wie die Filter auf der Abo-Liste.
export function NotifyDaysSelect({ defaultDays }: { defaultDays: number }) {
  const [days, setDays] = useState(String(defaultDays));
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Label htmlFor="notify_days">Vorlaufzeit</Label>
      <Select
        items={NOTIFY_DAYS_OPTIONS.map((d) => ({ value: String(d), label: `${d} Tage vorher` }))}
        value={days}
        disabled={isPending}
        onValueChange={(v) => {
          if (!v || v === days) return;
          const previous = days;
          setDays(v);
          startTransition(async () => {
            if (await updateNotifyDays(Number(v))) {
              toast.success("Gespeichert");
            } else {
              setDays(previous);
              toast.error("Konnte nicht gespeichert werden.");
            }
          });
        }}
      >
        <SelectTrigger id="notify_days" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {NOTIFY_DAYS_OPTIONS.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {d} Tage vorher
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        So weit im Voraus erscheinen anstehende Abrechnungen und auslaufende Aktionspreise unter
        Benachrichtigungen und zählen im Glocken-Symbol mit.
      </p>
    </div>
  );
}
