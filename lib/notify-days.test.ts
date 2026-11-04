import { test } from "node:test";
import assert from "node:assert/strict";

import { notifyCutoff } from "./notify-days.ts";

test("notifyCutoff rechnet die gewählte Vorlaufzeit auf heute drauf", () => {
  const today = new Date("2026-11-04T10:00:00Z");
  assert.equal(notifyCutoff(today, 3), "2026-11-07");
  assert.equal(notifyCutoff(today, 30), "2026-12-04");
});

test("notifyCutoff fällt bei unbekannten Werten auf 7 Tage zurück", () => {
  const today = new Date("2026-12-28T00:00:00Z");
  assert.equal(notifyCutoff(today, 0), "2027-01-04");
  assert.equal(notifyCutoff(today, 99), "2027-01-04");
});
