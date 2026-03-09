import type { Use, Material } from "../data/chips";

export interface ChipMeta {
  uses?: Use[];
  materials?: Material[];
  coating?: string | null;
}

const STORAGE_KEY = "chiplog_chip_meta";

function loadAll(): Record<string, ChipMeta> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, ChipMeta>;
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, ChipMeta>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getChipMeta(chipId: string): ChipMeta | undefined {
  const all = loadAll();
  return all[chipId];
}

export function setChipMeta(chipId: string, meta: ChipMeta): void {
  const all = loadAll();
  all[chipId] = meta;
  saveAll(all);
}
