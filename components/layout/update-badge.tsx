import { Badge } from "@/components/ui/badge";
import { CURRENT_VERSION, getLatestVersion, isNewerVersion } from "@/lib/version";

export async function UpdateBadge() {
  const latest = await getLatestVersion();
  if (!latest || !isNewerVersion(latest, CURRENT_VERSION)) return null;

  return (
    <Badge
      variant="warning"
      render={
        <a
          href={`https://github.com/CrazyJimPro/abo-tracker/releases/tag/v${latest}`}
          target="_blank"
          rel="noopener noreferrer"
        />
      }
    >
      Update verfügbar: v{latest}
    </Badge>
  );
}
