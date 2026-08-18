import Papa from "papaparse";
import type { BillingInterval, SubscriptionStatus } from "@/lib/db/schema";

export const CSV_HEADERS = [
  "ID",
  "Name",
  "Betrag",
  "Intervall",
  "Status",
  "Kategorie",
  "Nächste Abrechnung",
  "Regulärer Preis",
  "Aktionspreis gilt bis",
  "Notizen",
] as const;

// Byte-identical to BILLING_INTERVAL_OPTIONS / STATUS_OPTIONS in
// components/subscriptions/subscription-form.tsx. That file is a client
// component and this module is shared by a server action and a route
// handler, so there's no single export to import from — keep both in sync
// by hand if the German labels ever change.
export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  weekly: "Wöchentlich",
  monthly: "Monatlich",
  quarterly: "Vierteljährlich",
  yearly: "Jährlich",
};

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Aktiv",
  paused: "Pausiert",
  cancelled: "Gekündigt",
};

const BILLING_INTERVAL_BY_LABEL: Record<string, BillingInterval> = Object.fromEntries(
  Object.entries(BILLING_INTERVAL_LABELS).map(([value, label]) => [label, value as BillingInterval])
);

const STATUS_BY_LABEL: Record<string, SubscriptionStatus> = Object.fromEntries(
  Object.entries(STATUS_LABELS).map(([value, label]) => [label, value as SubscriptionStatus])
);

export function billingIntervalFromLabel(label: string): BillingInterval | null {
  return BILLING_INTERVAL_BY_LABEL[label.trim()] ?? null;
}

export function statusFromLabel(label: string): SubscriptionStatus | null {
  return STATUS_BY_LABEL[label.trim()] ?? null;
}

export type ExportRow = {
  id: string;
  name: string;
  amount: number;
  billingInterval: BillingInterval;
  status: SubscriptionStatus;
  categoryName: string | null;
  nextBillingDate: string | null;
  regularAmount: number | null;
  introUntil: string | null;
  notes: string | null;
};

function csvEscape(field: string): string {
  if (/[;"\r\n]/.test(field)) return `"${field.replace(/"/g, '""')}"`;
  return field;
}

export function formatGermanDecimal(n: number): string {
  // toFixed avoids float noise (9.990000000000001 etc.) before swapping the
  // decimal separator.
  return n.toFixed(2).replace(".", ",");
}

// "9,99" -> 9.99. A lone "." is tolerated defensively (some regional
// Excel/LibreOffice setups may re-save with a different decimal separator
// even though the column delimiter stays ";"), but "," wins when present
// since that's what we ourselves export.
export function parseGermanDecimal(s: string): number {
  const t = s.trim();
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
}

export function encodeSubscriptionsToCsv(rows: ExportRow[]): string {
  const lines = [CSV_HEADERS.join(";")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        csvEscape(r.name),
        formatGermanDecimal(r.amount),
        BILLING_INTERVAL_LABELS[r.billingInterval],
        STATUS_LABELS[r.status],
        r.categoryName ? csvEscape(r.categoryName) : "",
        r.nextBillingDate ?? "",
        r.regularAmount != null ? formatGermanDecimal(r.regularAmount) : "",
        r.introUntil ?? "",
        r.notes ? csvEscape(r.notes) : "",
      ].join(";")
    );
  }
  // BOM first so Excel/LibreOffice detect UTF-8 on double-click open; CRLF
  // line endings match the Windows/Excel CSV convention.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export type ParsedCsvRow = {
  raw: Record<string, string>;
  // 1-based Excel row number (header = row 1, first data row = row 2), so
  // error messages line up with what the user sees with the file open.
  rowNumber: number;
};

export function parseSubscriptionsCsv(text: string): {
  rows: ParsedCsvRow[];
  parseError: string | null;
} {
  const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const result = Papa.parse<Record<string, string>>(stripped, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    const first = result.errors[0];
    const where = first.row != null ? ` (Zeile ${first.row + 2})` : "";
    return {
      rows: [],
      parseError: `Datei konnte nicht gelesen werden${where}: ${first.message}`,
    };
  }

  return {
    rows: result.data.map((raw, i) => ({ raw, rowNumber: i + 2 })),
    parseError: null,
  };
}
