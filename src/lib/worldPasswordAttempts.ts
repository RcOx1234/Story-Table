const MAX_ATTEMPTS = 8;
const STORAGE_PREFIX = 'story-table-world-attempts-';

type AttemptRecord = { count: number; lockedUntil?: number };

function read(worldId: string): AttemptRecord {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${worldId}`);
    if (!raw) return { count: 0 };
    return JSON.parse(raw) as AttemptRecord;
  } catch {
    return { count: 0 };
  }
}

function write(worldId: string, record: AttemptRecord): void {
  localStorage.setItem(`${STORAGE_PREFIX}${worldId}`, JSON.stringify(record));
}

export function getWorldAttemptState(worldId: string): { remaining: number; locked: boolean; lockedUntil?: number } {
  const rec = read(worldId);
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    return { remaining: 0, locked: true, lockedUntil: rec.lockedUntil };
  }
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    write(worldId, { count: 0 });
    return { remaining: MAX_ATTEMPTS, locked: false };
  }
  return { remaining: Math.max(0, MAX_ATTEMPTS - rec.count), locked: false };
}

export function recordFailedWorldAttempt(worldId: string): { remaining: number; locked: boolean } {
  const rec = read(worldId);
  const next = rec.count + 1;
  if (next >= MAX_ATTEMPTS) {
    const lockedUntil = Date.now() + 15 * 60 * 1000;
    write(worldId, { count: next, lockedUntil });
    return { remaining: 0, locked: true };
  }
  write(worldId, { count: next });
  return { remaining: MAX_ATTEMPTS - next, locked: false };
}

export function clearWorldAttempts(worldId: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${worldId}`);
}

export const WORLD_PASSWORD_MAX_ATTEMPTS = MAX_ATTEMPTS;
