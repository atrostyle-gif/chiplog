import { db, type BreakerEntity } from "./db";
export type { BreakerEntity } from "./db";

export async function listBreakers(): Promise<BreakerEntity[]> {
  return db.breakers.orderBy("id").toArray();
}

export async function getBreakerById(
  id: string
): Promise<BreakerEntity | undefined> {
  return db.breakers.get(id);
}

export type BreakerUpsertInput = Omit<
  BreakerEntity,
  "createdAt" | "updatedAt"
> & { id?: string };

export async function upsertBreaker(
  input: BreakerUpsertInput
): Promise<BreakerEntity> {
  const maker = input.maker.trim();
  const code = input.code.trim();
  if (!maker) throw new Error("メーカーを入力してください");
  if (!code) throw new Error("ブレーカコードを入力してください");
  const id = input.id?.trim() || `${maker}:${code}`;
  const now = new Date().toISOString();
  const existing = await db.breakers.get(id);

  const entity: BreakerEntity = {
    id,
    maker,
    code,
    name: input.name.trim() || code,
    detail: input.detail,
    typicalUses: input.typicalUses,
    sourceNote: input.sourceNote,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.breakers.put(entity);
  return entity;
}

export async function deleteBreaker(id: string): Promise<void> {
  await db.breakers.delete(id);
}

