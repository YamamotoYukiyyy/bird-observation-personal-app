/** @typedef {{ id: string, postedAt: string, updatedAt: string, note: string, observationRaw: string }} Entry */
/** @typedef {{ id: string, entryId: string, species: string, count: number }} Observation */

export const STORAGE_KEY = "birdPersonal.v1";

/** @returns {{ version: number, entries: Entry[], observations: Observation[] }} */
export function createEmptyState() {
  return { version: 1, entries: [], observations: [] };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.entries) || !Array.isArray(data.observations)) {
      return createEmptyState();
    }
    return data;
  } catch {
    return createEmptyState();
  }
}

/** @param {{ version: number, entries: Entry[], observations: Observation[] }} state */
export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
