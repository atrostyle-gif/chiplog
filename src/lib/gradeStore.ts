import { db, type GradeEntity } from "./db";
export type { GradeEntity } from "./db";

export async function listGrades(): Promise<GradeEntity[]> {
  return db.grades.orderBy("id").toArray();
}

export async function getGradeById(
  id: string
): Promise<GradeEntity | undefined> {
  return db.grades.get(id);
}

export type GradeUpsertInput = Omit<
  GradeEntity,
  "createdAt" | "updatedAt"
> & { id?: string };

export async function upsertGrade(
  input: GradeUpsertInput
): Promise<GradeEntity> {
  const id = input.id?.trim() || input.id || input.name.trim();
  if (!id) throw new Error("材種IDを入力してください");
  const name = input.name.trim() || id;
  const now = new Date().toISOString();
  const existing = await db.grades.get(id);

  const entity: GradeEntity = {
    id,
    maker: input.maker,
    name,
    coatingShort: input.coatingShort,
    coatingDetail: input.coatingDetail,
    recommendedMaterials: input.recommendedMaterials,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.grades.put(entity);
  return entity;
}

export async function deleteGrade(id: string): Promise<void> {
  await db.grades.delete(id);
}

