import "server-only";

// Default import rather than `import { version } from ...`: webpack warns on
// every build that named exports from JSON modules are going away ("only
// default export is available soon"), which would turn this into a build
// failure on a future Next.js/webpack upgrade.
import packageJson from "@/package.json";

const REPO = "CrazyJimPro/abo-tracker";

export const CURRENT_VERSION = packageJson.version;

export async function getLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      // Checked at most once an hour — this runs on every page load (the
      // whole (app) layout is already dynamic because of requireUser's
      // cookie read), so without an explicit revalidate window it would
      // hit the GitHub API on every request.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const tag = typeof data.tag_name === "string" ? data.tag_name : null;
    return tag ? tag.replace(/^v/, "") : null;
  } catch {
    // Offline, GitHub unreachable, rate-limited, whatever — this is a
    // best-effort convenience check, never worth surfacing as an error.
    return null;
  }
}

// Both versions are always well-formed major.minor.patch strings (package.json
// and our own GitHub release tags), so a full semver library would be
// overkill for comparing them.
export function isNewerVersion(latest: string, current: string): boolean {
  const a = latest.split(".").map(Number);
  const b = current.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}
