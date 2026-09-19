// Läuft mit "npm test" direkt über Nodes eingebauten Test-Runner und dessen
// TypeScript-Unterstützung — daher die expliziten .ts-Endungen.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  billingIntervalFromLabel,
  decodeCsvBytes,
  encodeSubscriptionsToCsv,
  normalizeImportDate,
  parseSubscriptionsCsv,
  type ExportRow,
} from "./csv.ts";
import { isValidIsoDate } from "./subscription-validation.ts";

const row: ExportRow = {
  id: "0b9f3c1e-7a2d-4c55-9e1a-2f6d8b4a0c11",
  name: "Fitnessstudio Größe",
  amount: 29.9,
  billingInterval: "yearly",
  status: "cancelled",
  categoryName: "Fitness",
  nextBillingDate: "2026-10-01",
  regularAmount: 39.9,
  introUntil: "2026-12-31",
  notes: "Kündigung; bestätigt",
};

function firstRow(text: string) {
  const { rows, parseError } = parseSubscriptionsCsv(text);
  assert.equal(parseError, null);
  return rows[0].raw;
}

test("Export aus der App wird unverändert wieder gelesen", () => {
  const csv = encodeSubscriptionsToCsv([row]);
  const bytes = new TextEncoder().encode(csv);
  const raw = firstRow(decodeCsvBytes(bytes));
  assert.equal(raw["Name"], "Fitnessstudio Größe");
  assert.equal(billingIntervalFromLabel(raw["Intervall"]), "yearly");
  assert.equal(raw["Status"], "Gekündigt");
  assert.equal(raw["Nächste Abrechnung"], "2026-10-01");
  assert.equal(raw["Regulärer Preis"], "39,90");
  assert.equal(raw["Notizen"], "Kündigung; bestätigt");
});

test("Von Excel gespeicherte Datei (Windows-1252, ohne BOM, deutsches Datum)", () => {
  // So legt Excel für Windows "CSV (Trennzeichen-getrennt)" ab. Jedes
  // Zeichen hier ist < 256, daher entspricht "latin1" genau Windows-1252.
  const excel = encodeSubscriptionsToCsv([row])
    .slice(1)
    .replace("2026-10-01", "01.10.2026")
    .replace("2026-12-31", "31.12.2026");
  const raw = firstRow(decodeCsvBytes(Buffer.from(excel, "latin1")));
  assert.equal(raw["Name"], "Fitnessstudio Größe");
  assert.equal(billingIntervalFromLabel(raw["Intervall"]), "yearly");
  assert.equal(raw["Status"], "Gekündigt");
  assert.equal(normalizeImportDate(raw["Nächste Abrechnung"]), "2026-10-01");
  assert.equal(normalizeImportDate(raw["Aktionspreis gilt bis"]), "2026-12-31");
  assert.equal(raw["Regulärer Preis"], "39,90");
});

test("normalizeImportDate", () => {
  assert.equal(normalizeImportDate(""), null);
  assert.equal(normalizeImportDate("  "), null);
  assert.equal(normalizeImportDate("2026-10-01"), "2026-10-01");
  assert.equal(normalizeImportDate("01.10.2026"), "2026-10-01");
  assert.equal(normalizeImportDate("1.2.26"), "2026-02-01");
  // Unbekanntes bleibt stehen, damit validate() es mit Wert melden kann.
  assert.equal(normalizeImportDate("10/1/2026"), "10/1/2026");
});

test("isValidIsoDate", () => {
  assert.equal(isValidIsoDate("2026-10-01"), true);
  assert.equal(isValidIsoDate("2028-02-29"), true);
  assert.equal(isValidIsoDate("2026-02-29"), false);
  assert.equal(isValidIsoDate("2026-13-01"), false);
  assert.equal(isValidIsoDate("01.10.2026"), false);
});
