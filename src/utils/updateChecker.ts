import { getVersion } from "@tauri-apps/api/app";

const GITHUB_REPO = "CreateChance/mdviewer";

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  releaseNotes: string;
  hasUpdate: boolean;
}

export interface UpdateResult {
  status: "update" | "uptodate" | "no-release" | "error";
  info?: UpdateInfo;
}

/**
 * Compare two semver version strings.
 * Returns true if remote is newer than local.
 */
function isNewer(local: string, remote: string): boolean {
  const localParts = local.split(".").map(Number);
  const remoteParts = remote.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const l = localParts[i] || 0;
    const r = remoteParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

/**
 * Check GitHub Releases for a newer version.
 * Only skips draft releases; prerelease versions are included.
 */
export async function checkForUpdate(): Promise<UpdateResult> {
  try {
    const currentVersion = await getVersion();

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!res.ok) return { status: "error" };

    const releases = await res.json();
    const latest = (releases as Array<{ draft: boolean; tag_name: string; html_url: string; body: string }>)
      .find((r) => !r.draft);

    if (!latest) return { status: "no-release" };

    const latestVersion = latest.tag_name.replace(/^v/, "");
    const hasUpdate = isNewer(currentVersion, latestVersion);

    return {
      status: hasUpdate ? "update" : "uptodate",
      info: {
        currentVersion,
        latestVersion,
        releaseUrl: latest.html_url,
        releaseNotes: latest.body || "",
        hasUpdate,
      },
    };
  } catch (err) {
    console.error("Failed to check for update:", err);
    return { status: "error" };
  }
}
