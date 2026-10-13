// Single source of truth for the running app version. The value is baked in from
// package.json at build time (see vite.config.ts), so bumping package.json is all
// it takes to publish a new version marker.

export const APP_VERSION: string = __APP_VERSION__;

const majorOf = (version: string): string => version.split('.')[0] ?? '';

/**
 * Only a MAJOR bump (e.g. 1.x -> 2.x) is worth interrupting the player for.
 * Minor and patch releases are picked up silently: the service worker
 * (registerType: 'autoUpdate') swaps in the new build and it is used from the
 * next launch onwards, so the player is never nagged to reload.
 */
export const isMajorUpgrade = (
  remoteVersion: string,
  currentVersion: string = APP_VERSION,
): boolean => majorOf(remoteVersion) !== majorOf(currentVersion);

interface VersionPayload {
  version?: string;
}

// Remembers the major version the player already chose to skip, so a dismissed
// notice is not shown again on every launch (only a NEWER major brings it back).
const UPDATE_NOTICE_DISMISSED_KEY = 'wordcrew_update_dismissed_version';

export const readDismissedUpdateVersion = (): string | null => {
  try {
    return localStorage.getItem(UPDATE_NOTICE_DISMISSED_KEY);
  } catch {
    return null;
  }
};

export const writeDismissedUpdateVersion = (version: string): void => {
  try {
    localStorage.setItem(UPDATE_NOTICE_DISMISSED_KEY, version);
  } catch {
    // Storage unavailable: the notice reappears next launch.
  }
};

/**
 * Reads the deployed version marker over the network (never from cache).
 * Returns null when offline or the file is unavailable — in that case we simply
 * skip the check and try again on the next app focus.
 */
export const fetchRemoteVersion = async (): Promise<string | null> => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' });
    if (!response.ok) return null;
    const payload = (await response.json()) as VersionPayload;
    return typeof payload.version === 'string' ? payload.version : null;
  } catch {
    return null;
  }
};
