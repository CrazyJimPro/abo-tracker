import type { NoticeUnit } from "@/lib/db/schema";

// Vertragsende und Kündigungsfrist eines Abos. Beides ist freiwillig; daraus
// ergibt sich, bis wann spätestens gekündigt werden muss. Liegt im
// Gemeinsam-Teil (nicht "use server"), weil Formular, Liste, Benachrichtigungen
// und Server-Action dieselbe Rechnung brauchen.

export const NOTICE_UNIT_LABELS: Record<NoticeUnit, string> = {
  days: "Tage",
  weeks: "Wochen",
  months: "Monate",
};

// Spätester Kündigungstag (JJJJ-MM-TT) oder null, wenn kein Vertragsende
// eingetragen ist. Ohne Frist gilt das Vertragsende selbst. Bei Monaten wird
// auf den letzten Tag des Zielmonats gekürzt: 31.12. minus 3 Monate ist der
// 30.09., nicht der 01.10.
export function cancelByDate(
  contractEnd: string | null,
  noticePeriod: number | null,
  noticeUnit: string | null
): string | null {
  if (!contractEnd) return null;
  if (!noticePeriod) return contractEnd;

  const [y, m, d] = contractEnd.split("-").map(Number);
  let date: Date;
  if (noticeUnit === "days" || noticeUnit === "weeks") {
    const days = noticeUnit === "weeks" ? noticePeriod * 7 : noticePeriod;
    date = new Date(Date.UTC(y, m - 1, d - days));
  } else {
    // "months" und alles Unbekannte: Monate sind die übliche Angabe.
    const lastDayOfTarget = new Date(Date.UTC(y, m - 1 - noticePeriod + 1, 0)).getUTCDate();
    date = new Date(Date.UTC(y, m - 1 - noticePeriod, Math.min(d, lastDayOfTarget)));
  }
  return date.toISOString().slice(0, 10);
}

// "3 Monate", "1 Woche", "14 Tage"
export function formatNoticePeriod(noticePeriod: number, noticeUnit: string | null): string {
  const unit = (noticeUnit as NoticeUnit) in NOTICE_UNIT_LABELS ? (noticeUnit as NoticeUnit) : "months";
  if (noticePeriod === 1) return `1 ${{ days: "Tag", weeks: "Woche", months: "Monat" }[unit]}`;
  return `${noticePeriod} ${NOTICE_UNIT_LABELS[unit]}`;
}
