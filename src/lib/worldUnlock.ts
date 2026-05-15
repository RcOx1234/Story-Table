import type { World } from '@/types';
import { sha256Hex } from '@/lib/password';

const STORAGE_KEY = 'story-table-unlocked-worlds';

function readSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function isWorldUnlocked(worldId: string): boolean {
  return readSet().has(worldId);
}

export function markWorldUnlocked(worldId: string): void {
  const s = readSet();
  s.add(worldId);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
}

export async function verifyWorldAccess(world: World, password: string): Promise<boolean> {
  if (!world.protected) return true;
  if (world.passwordHash) {
    return (await sha256Hex(password)) === world.passwordHash;
  }
  if (world.password) return password === world.password;
  return false;
}
