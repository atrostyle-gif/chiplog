import type { MaterialISO } from "./conditionStore";
import { db } from "./db";
import type { MaterialEntity } from "./db";
export type { MaterialEntity } from "./db";
import { materialNormalizeKey } from "./normalize";

export async function listMaterials(): Promise<MaterialEntity[]> {
  return db.materials.orderBy("name").toArray();
}

export async function addMaterial(
  name: string,
  iso?: MaterialISO
): Promise<MaterialEntity> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("材質名を入力してください");
  const key = materialNormalizeKey(trimmed);
  const all = await db.materials.toArray();
  const existing = all.find((m) => materialNormalizeKey(m.name) === key);
  if (existing) {
    if (!existing.iso && iso) {
      await db.materials.update(existing.id, { iso });
      return { ...existing, iso };
    }
    return existing;
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const entity: MaterialEntity = { id, name: trimmed, iso, createdAt: now };
  await db.materials.add(entity);
  return entity;
}

export async function getMaterialById(id: string): Promise<MaterialEntity | undefined> {
  return db.materials.get(id);
}
