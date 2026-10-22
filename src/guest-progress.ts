/**
 * Local-only guest progress for the browser prototype.
 * Nothing in this module sends data to a server or stores personal information.
 */

const STORAGE_KEY = 'indianRailways.guestProgress.v1';

export interface GuestProgress {
  version: 1;
  guestId: string;
  createdAt: string;
  lastPlayedAt: string;
  sessionCount: number;
  totalPlaySeconds: number;
}

export interface GuestSessionTracker {
  /** False when this browser blocks localStorage; the scene still works for this visit. */
  persistent: boolean;
  guestId: string;
  stop: () => void;
}

function makeGuestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function isGuestProgress(value: unknown): value is GuestProgress {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<GuestProgress>;
  return record.version === 1
    && typeof record.guestId === 'string'
    && typeof record.createdAt === 'string'
    && typeof record.lastPlayedAt === 'string'
    && Number.isSafeInteger(record.sessionCount)
    && (record.sessionCount ?? -1) >= 0
    && Number.isSafeInteger(record.totalPlaySeconds)
    && (record.totalPlaySeconds ?? -1) >= 0;
}

function readStoredProgress(): GuestProgress | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isGuestProgress(parsed) ? parsed : null;
  } catch {
    // Private browsing settings or storage policies can disable localStorage.
    return null;
  }
}

function writeStoredProgress(progress: GuestProgress): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

/** Exposed for the future, opt-in Settings → Save to account flow. */
export function readGuestProgressSnapshot(): GuestProgress | null {
  return readStoredProgress();
}

/** Start one guest visit and keep approximate foreground playtime on this device. */
export function startGuestSession(): GuestSessionTracker {
  const now = Date.now();
  const isoNow = new Date(now).toISOString();
  const progress = readStoredProgress() ?? {
    version: 1 as const,
    guestId: makeGuestId(),
    createdAt: isoNow,
    lastPlayedAt: isoNow,
    sessionCount: 0,
    totalPlaySeconds: 0,
  };

  progress.sessionCount += 1;
  progress.lastPlayedAt = isoNow;
  const persistent = writeStoredProgress(progress);

  let lastSavedAt = now;
  let isVisible = document.visibilityState === 'visible';
  let stopped = false;

  const saveElapsedTime = (): void => {
    if (stopped) return;
    const currentTime = Date.now();
    if (isVisible) {
      const elapsedSeconds = Math.floor((currentTime - lastSavedAt) / 1_000);
      if (elapsedSeconds > 0) {
        progress.totalPlaySeconds += elapsedSeconds;
        progress.lastPlayedAt = new Date(currentTime).toISOString();
        writeStoredProgress(progress);
      }
    }
    lastSavedAt = currentTime;
  };

  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      saveElapsedTime();
      isVisible = false;
      return;
    }
    // Do not count time while the game tab is in the background.
    lastSavedAt = Date.now();
    isVisible = true;
  };

  const stop = (): void => {
    if (stopped) return;
    saveElapsedTime();
    stopped = true;
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', stop);
  };

  const intervalId = window.setInterval(saveElapsedTime, 15_000);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', stop, { once: true });

  return { persistent, guestId: progress.guestId, stop };
}
