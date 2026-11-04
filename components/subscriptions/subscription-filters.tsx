"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  updateAboCategoryFilter,
  updateAboPaymentFilter,
  updateAboStatusFilter,
} from "@/lib/actions/profile";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/subscription-validation";

type CategoryOption = { id: string; name: string };

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function SubscriptionFilters({
  categories,
  initialQ,
  initialStatus,
  initialKategorie,
  initialZahlung,
}: {
  categories: CategoryOption[];
  initialQ: string;
  initialStatus: string;
  initialKategorie: string;
  initialZahlung: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus);
  const [kategorie, setKategorie] = useState(initialKategorie);
  const [zahlung, setZahlung] = useState(initialZahlung);
  const first = useRef(true);

  useEffect(() => {
    // Skip the navigation that would otherwise fire on initial mount.
    if (first.current) {
      first.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (kategorie) params.set("kategorie", kategorie);
      if (zahlung) params.set("zahlung", zahlung);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 250);
    return () => clearTimeout(timeout);
  }, [q, status, kategorie, zahlung, pathname, router]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Suche nach Name…"
        className="max-w-56"
      />
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          void updateAboStatusFilter(e.target.value);
        }}
        className={SELECT_CLASS}
      >
        <option value="">Aktiv &amp; pausiert</option>
        <option value="active">Aktiv</option>
        <option value="paused">Pausiert</option>
        <option value="cancelled">Gekündigt</option>
        <option value="all">Alle Status</option>
      </select>
      <select
        value={kategorie}
        onChange={(e) => {
          setKategorie(e.target.value);
          void updateAboCategoryFilter(e.target.value);
        }}
        className={SELECT_CLASS}
      >
        <option value="">Alle Kategorien</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={zahlung}
        onChange={(e) => {
          setZahlung(e.target.value);
          void updateAboPaymentFilter(e.target.value);
        }}
        className={SELECT_CLASS}
        aria-label="Zahlungsart"
      >
        <option value="">Alle Zahlungsarten</option>
        {PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>
            {PAYMENT_METHOD_LABELS[m]}
          </option>
        ))}
        <option value="none">Ohne Angabe</option>
      </select>
    </div>
  );
}
