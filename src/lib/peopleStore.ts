import { db } from "./db";
import type { PersonEntity } from "./db";
export type { PersonEntity } from "./db";
import { personNormalizeKey } from "./normalize";

export async function listPeople(): Promise<PersonEntity[]> {
  return db.people.orderBy("name").toArray();
}

export async function addPerson(name: string): Promise<PersonEntity> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("記入者名を入力してください");
  const key = personNormalizeKey(trimmed);
  const all = await db.people.toArray();
  const existing = all.find((p) => personNormalizeKey(p.name) === key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const entity: PersonEntity = { id, name: trimmed, createdAt: now };
  await db.people.add(entity);
  return entity;
}

export async function getPersonById(id: string): Promise<PersonEntity | undefined> {
  return db.people.get(id);
}
