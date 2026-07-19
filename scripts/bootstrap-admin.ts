import { createClient } from "@supabase/supabase-js";
import { generateTempPassword } from "../lib/passwords";

const ADMIN_EMAIL = "c.jung2811@gmx.de";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SECRET_KEY müssen in .env.local gesetzt sein."
    );
    process.exit(1);
  }

  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await supabase.auth.admin.listUsers();
  const already = existing?.users.find((u) => u.email === ADMIN_EMAIL);
  if (already) {
    console.log(`Admin-User ${ADMIN_EMAIL} existiert bereits (id: ${already.id}). Nichts zu tun.`);
    process.exit(0);
  }

  const tempPassword = generateTempPassword();

  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: tempPassword,
    email_confirm: true,
  });

  if (error || !data.user) {
    console.error("Fehler beim Anlegen des Admin-Users:", error?.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: "admin", must_change_password: true, display_name: "Christian" })
    .eq("id", data.user.id);

  if (profileError) {
    console.error("User wurde angelegt, aber Profil-Update fehlgeschlagen:", profileError.message);
    process.exit(1);
  }

  console.log("\nAdmin-User erfolgreich angelegt.");
  console.log(`  E-Mail:            ${ADMIN_EMAIL}`);
  console.log(`  Temporäres Passwort: ${tempPassword}`);
  console.log("\nDieses Passwort wird nur einmal angezeigt. Beim ersten Login muss es geändert werden.\n");
}

main();
