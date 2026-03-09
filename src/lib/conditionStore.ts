export type MaterialISO = "P" | "M" | "N" | "K" | "S" | "H";

export interface ConditionSet {
  vcMin?: number;
  vcMax?: number;
  feedMin?: number;
  feedMax?: number;
  apMin?: number;
  apMax?: number;
  note?: string;
}

export interface ChipMaterialCondition {
  chipId: string;
  iso: MaterialISO;
  maker?: ConditionSet;
  shop?: ConditionSet;
  updatedAt: string;
}

const STORAGE_KEY = "chiplog_conditions";

function loadRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function toConditionSet(raw: unknown): ConditionSet | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  return {
    vcMin: typeof o.vcMin === "number" ? o.vcMin : undefined,
    vcMax: typeof o.vcMax === "number" ? o.vcMax : undefined,
    feedMin: typeof o.feedMin === "number" ? o.feedMin : undefined,
    feedMax: typeof o.feedMax === "number" ? o.feedMax : undefined,
    apMin: typeof o.apMin === "number" ? o.apMin : undefined,
    apMax: typeof o.apMax === "number" ? o.apMax : undefined,
    note: typeof o.note === "string" ? o.note : undefined,
  };
}

const ISO_LIST: MaterialISO[] = ["P", "M", "N", "K", "S", "H"];

/** ISO 表示用ラベル（UIは必ずこのラベルを表示する） */
export const ISO_LABEL: Record<MaterialISO, string> = {
  P: "P（鋼）",
  M: "M（ステンレス）",
  N: "N（非鉄）",
  K: "K（鋳鉄）",
  S: "S（耐熱合金・チタン）",
  H: "H（焼入鋼）",
};

function isMaterialISO(s: string): s is MaterialISO {
  return ISO_LIST.includes(s as MaterialISO);
}

function normalize(item: unknown): ChipMaterialCondition | null {
  if (item == null || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const iso = o.iso;
  if (typeof iso !== "string" || !isMaterialISO(iso)) return null;
  const chipId = String(o.chipId ?? "");
  if (!chipId) return null;
  return {
    chipId,
    iso,
    maker: toConditionSet(o.maker),
    shop: toConditionSet(o.shop),
    updatedAt: String(o.updatedAt ?? ""),
  };
}

export function listConditions(): ChipMaterialCondition[] {
  const raw = loadRaw();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalize)
      .filter((c): c is ChipMaterialCondition => c !== null);
  } catch {
    return [];
  }
}

export function getCondition(
  chipId: string,
  iso: MaterialISO
): ChipMaterialCondition | null {
  return (
    listConditions().find((c) => c.chipId === chipId && c.iso === iso) ?? null
  );
}

export function upsertCondition(condition: ChipMaterialCondition): void {
  const list = listConditions();
  const next: ChipMaterialCondition = {
    ...condition,
    updatedAt: new Date().toISOString(),
  };
  const idx = list.findIndex(
    (c) => c.chipId === condition.chipId && c.iso === condition.iso
  );
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function deleteCondition(chipId: string, iso: MaterialISO): void {
  const list = listConditions().filter(
    (c) => !(c.chipId === chipId && c.iso === iso)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const MATERIAL_ISO_OPTIONS: MaterialISO[] = ISO_LIST;
