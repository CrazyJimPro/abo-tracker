import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { listSubscriptions } from "@/lib/db/queries";
import { encodeSubscriptionsToCsv } from "@/lib/csv";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Nicht angemeldet.", { status: 401 });

  // "all" bypasses listSubscriptions' default status filter, which hides
  // cancelled subscriptions — a backup must include those too.
  const rows = listSubscriptions(user.id, { status: "all" });
  const csv = encodeSubscriptionsToCsv(rows);
  const filename = `abo-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
