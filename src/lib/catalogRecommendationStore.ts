import { db, type CatalogRecommendationEntity } from "./db";
import type { MaterialISO } from "./conditionStore";

export type { CatalogRecommendationEntity } from "./db";

function buildId(params: {
  maker: string;
  grade: string;
  iso: MaterialISO;
  breaker?: string;
  noseR?: number;
}): string {
  const maker = params.maker.trim();
  const grade = params.grade.trim();
  const iso = params.iso;
  const breaker = params.breaker?.trim() || "*";
  const nose =
    params.noseR == null || Number.isNaN(params.noseR)
      ? "*"
      : String(params.noseR);
  return `${maker}|${grade}|${iso}|${breaker}|${nose}`;
}

export type CatalogRecommendationUpsertInput = Omit<
  CatalogRecommendationEntity,
  "id" | "createdAt" | "updatedAt"
> & { id?: string };

export async function upsertCatalogRecommendation(
  input: CatalogRecommendationUpsertInput
): Promise<CatalogRecommendationEntity> {
  const maker = input.maker.trim();
  const grade = input.grade.trim();
  if (!maker) throw new Error("メーカーを入力してください");
  if (!grade) throw new Error("材種を入力してください");

  const id =
    input.id ??
    buildId({
      maker,
      grade,
      iso: input.iso,
      breaker: input.breaker,
      noseR: input.noseR,
    });

  const existing = await db.catalogRecommendations.get(id);
  const now = new Date().toISOString();

  const entity: CatalogRecommendationEntity = {
    id,
    maker,
    grade,
    iso: input.iso,
    useTags: input.useTags ?? [],
    breaker: input.breaker?.trim() || undefined,
    noseR: input.noseR,
    vcMin: input.vcMin,
    vcMax: input.vcMax,
    feedMin: input.feedMin,
    feedMax: input.feedMax,
    apMin: input.apMin,
    apMax: input.apMax,
    note: input.note,
    source: "catalog",
    sourceUrl: input.sourceUrl,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.catalogRecommendations.put(entity);
  return entity;
}

export async function deleteCatalogRecommendation(id: string): Promise<void> {
  await db.catalogRecommendations.delete(id);
}

export interface ListCatalogRecommendationsFilters {
  maker?: string;
  grade?: string;
  iso?: MaterialISO;
  breaker?: string;
  noseR?: number;
}

export async function listCatalogRecommendations(
  filters?: ListCatalogRecommendationsFilters
): Promise<CatalogRecommendationEntity[]> {
  const all = await db.catalogRecommendations.orderBy("updatedAt").reverse().toArray();

  return all.filter((r) => {
    if (filters?.maker?.trim() && r.maker !== filters.maker!.trim()) return false;
    if (filters?.grade?.trim() && r.grade !== filters.grade.trim()) return false;
    if (filters?.iso && r.iso !== filters.iso) return false;
    if (filters?.breaker != null) {
      const want = filters.breaker.trim();
      if (want && r.breaker !== want) return false;
      if (!want && r.breaker != null && r.breaker !== "") return false;
    }
    if (filters?.noseR != null) {
      if (r.noseR !== filters.noseR) return false;
    }
    return true;
  });
}

export interface BestCatalogRecommendationParams {
  maker: string;
  grade: string;
  iso: MaterialISO;
  breakerCode?: string | null;
  noseRmm?: number | null;
}

export async function getBestCatalogRecommendation(
  params: BestCatalogRecommendationParams
): Promise<CatalogRecommendationEntity | undefined> {
  const maker = params.maker.trim();
  const grade = params.grade.trim();
  const iso = params.iso;
  const breakerCode = params.breakerCode ?? null;
  const noseRmm = params.noseRmm ?? null;

  const all = await db.catalogRecommendations.where("maker").equals(maker).toArray();
  const candidates = all.filter((r) => r.grade === grade && r.iso === iso);

  let best: CatalogRecommendationEntity | undefined;
  let bestScore = -1;
  const paramBreaker = (breakerCode ?? "").toString().trim();

  for (const r of candidates) {
    let score = 0;
    const rBreaker = (r.breaker ?? "").trim();
    const breakerMatches =
      paramBreaker !== "" && rBreaker !== "" && rBreaker === paramBreaker;
    const breakerGeneric = rBreaker === "";
    const noseMatches =
      noseRmm != null && r.noseR != null && r.noseR === noseRmm;
    const noseGeneric = r.noseR == null;

    if (breakerMatches && noseMatches) score = 3;
    else if (breakerMatches && noseGeneric) score = 2;
    else if (breakerGeneric && noseGeneric) score = 1;
    else score = 0;

    if (score > bestScore) {
      best = r;
      bestScore = score;
    } else if (score === bestScore && best) {
      if ((r.updatedAt ?? "") > (best.updatedAt ?? "")) {
        best = r;
      }
    }
  }

  return best;
}
