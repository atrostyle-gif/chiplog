import { db } from "./db";
import type { CompanyEntity } from "./db";
export type { CompanyEntity } from "./db";
import { companyNormalizeKey } from "./normalize";

export async function listCompanies(): Promise<CompanyEntity[]> {
  return db.companies.orderBy("name").toArray();
}

export async function searchCompanies(
  query: string,
  limit = 8
): Promise<CompanyEntity[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await db.companies.toArray();
  const prefix: CompanyEntity[] = [];
  const partial: CompanyEntity[] = [];
  for (const c of all) {
    const nameLower = c.name.toLowerCase();
    if (nameLower.startsWith(q)) prefix.push(c);
    else if (nameLower.includes(q)) partial.push(c);
  }
  const sortByLastUsedThenName = (a: CompanyEntity, b: CompanyEntity) => {
    const aVal = a.lastUsedAt ?? "";
    const bVal = b.lastUsedAt ?? "";
    if (aVal !== bVal) return bVal.localeCompare(aVal);
    return a.name.localeCompare(b.name);
  };
  prefix.sort(sortByLastUsedThenName);
  partial.sort(sortByLastUsedThenName);
  const combined = [...prefix, ...partial];
  return combined.slice(0, limit);
}

export async function addCompany(name: string): Promise<CompanyEntity> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("社名を入力してください");
  const key = companyNormalizeKey(trimmed);
  const all = await db.companies.toArray();
  const existing = all.find((c) => companyNormalizeKey(c.name) === key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const entity: CompanyEntity = { id, name: trimmed, createdAt: now };
  await db.companies.add(entity);
  return entity;
}

export async function touchCompany(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.companies.update(id, { lastUsedAt: now });
}
