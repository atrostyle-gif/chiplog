import type { MaterialISO } from "../lib/conditionStore";

const ISO_LIST: MaterialISO[] = ["P", "M", "N", "K", "S", "H"];

function isMaterialISO(s: unknown): s is MaterialISO {
  return typeof s === "string" && ISO_LIST.includes(s as MaterialISO);
}

export interface CuttingLogEntry {
  id: string;
  date: string;
  chip: string;
  material: string;
  machine: string;
  rpm: number;
  feed: number;
  doc: number;
  memo: string;
  iso?: MaterialISO;
}

const STORAGE_KEY = "chiplog_logs";

function loadRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function normalize(raw: Record<string, unknown>): CuttingLogEntry {
  return {
    id: String(raw.id ?? ""),
    date: String(raw.date ?? ""),
    chip: String(raw.chip ?? ""),
    material: String(raw.material ?? ""),
    machine: String(raw.machine ?? ""),
    rpm: toNum(raw.rpm),
    feed: toNum(raw.feed),
    doc: toNum(raw.doc),
    memo: String(raw.memo ?? ""),
    iso: isMaterialISO(raw.iso) ? raw.iso : undefined,
  };
}

export function loadLogs(): CuttingLogEntry[] {
  const raw = loadRaw();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalize(item as Record<string, unknown>));
  } catch {
    return [];
  }
}

export function saveLogs(entries: CuttingLogEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addLog(
  entry: Omit<CuttingLogEntry, "id">
): CuttingLogEntry {
  const logs = loadLogs();
  const id = crypto.randomUUID();
  const newEntry: CuttingLogEntry = { ...entry, id };
  saveLogs([...logs, newEntry]);
  return newEntry;
}

export function updateLog(
  id: string,
  entry: Omit<CuttingLogEntry, "id">
): void {
  const logs = loadLogs();
  const index = logs.findIndex((e) => e.id === id);
  if (index === -1) return;
  logs[index] = { ...entry, id };
  saveLogs(logs);
}

export function deleteLog(id: string): void {
  const logs = loadLogs().filter((e) => e.id !== id);
  saveLogs(logs);
}
