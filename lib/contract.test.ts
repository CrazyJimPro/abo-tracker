import { test } from "node:test";
import assert from "node:assert/strict";

import { cancelByDate, formatNoticePeriod } from "./contract.ts";

test("cancelByDate ohne Vertragsende gibt null", () => {
  assert.equal(cancelByDate(null, 3, "months"), null);
});

test("cancelByDate ohne Frist ist das Vertragsende selbst", () => {
  assert.equal(cancelByDate("2026-12-31", null, null), "2026-12-31");
  assert.equal(cancelByDate("2026-12-31", 0, "months"), "2026-12-31");
});

test("cancelByDate mit Tagen und Wochen", () => {
  assert.equal(cancelByDate("2026-12-31", 14, "days"), "2026-12-17");
  assert.equal(cancelByDate("2027-01-10", 2, "weeks"), "2026-12-27");
});

test("cancelByDate mit Monaten kürzt auf das Monatsende", () => {
  assert.equal(cancelByDate("2026-12-31", 3, "months"), "2026-09-30");
  assert.equal(cancelByDate("2027-03-31", 1, "months"), "2027-02-28");
  assert.equal(cancelByDate("2027-01-15", 1, "months"), "2026-12-15");
  assert.equal(cancelByDate("2027-06-30", 12, "months"), "2026-06-30");
});

test("formatNoticePeriod", () => {
  assert.equal(formatNoticePeriod(3, "months"), "3 Monate");
  assert.equal(formatNoticePeriod(1, "weeks"), "1 Woche");
  assert.equal(formatNoticePeriod(1, "days"), "1 Tag");
});
