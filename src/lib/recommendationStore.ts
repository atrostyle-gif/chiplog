import { db, type RecommendationEntity } from "./db";
import type { MaterialISO } from "./conditionStore";

export type { RecommendationEntity } from "./db";

function buildId(params: {
  maker: string;
  gradeId: string;
  iso: MaterialISO;
  breakerCode?: string | null;
  noseRmm?: number | null;
}): string {
  const maker = params.maker.trim();
  const gradeId = params.gradeId.trim();
  const iso = params.iso;
  const breaker = params.breakerCode?.trim() || "*";
  const nose =
    params.noseRmm == null || Number.isNaN(params.noseRmm) ? "*" : String(params.noseRmm);
  return `${maker}|${gradeId}|${iso}|${breaker}|${nose}`;
}

export type RecommendationUpsertInput = Omit<
  RecommendationEntity,
  "id" | "createdAt" | "updatedAt"
> & { id?: string };

export async function upsertRecommendation(
  input: RecommendationUpsertInput
): Promise<RecommendationEntity> {
  const maker = input.maker.trim();
  const gradeId = input.gradeId.trim();
  if (!maker) throw new Error("メーカーを入力してください");
  if (!gradeId) throw new Error("材種IDを入力してください");

  const id =
    input.id ??
    buildId({
      maker,
      gradeId,
      iso: input.iso,
      breakerCode: input.breakerCode ?? null,
      noseRmm: input.noseRmm ?? null,
    });

  const existing = await db.recommendations.get(id);
  const now = new Date().toISOString();

  const entity: RecommendationEntity = {
    id,
    maker,
    gradeId,
    iso: input.iso,
    breakerCode: input.breakerCode ?? null,
    noseRmm: input.noseRmm ?? null,
    vcMin: input.vcMin,
    vcMax: input.vcMax,
    feedMin: input.feedMin,
    feedMax: input.feedMax,
    apMin: input.apMin,
    apMax: input.apMax,
    note: input.note,
    source: input.source,
    sourceUrl: input.sourceUrl,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.recommendations.put(entity);
  return entity;
}

export async function deleteRecommendation(id: string): Promise<void> {
  await db.recommendations.delete(id);
}

export async function listRecommendationsByGrade(
  maker: string,
  gradeId: string
): Promise<RecommendationEntity[]> {
  const list = await db.recommendations.where("maker").equals(maker).toArray();
  return list.filter((r) => r.gradeId === gradeId);
}

export interface BestRecommendationParams {
  maker: string;
  gradeId: string;
  iso: MaterialISO;
  breakerCode?: string | null;
  noseRmm?: number | null;
}

export async function getBestRecommendation(
  params: BestRecommendationParams
): Promise<RecommendationEntity | undefined> {
  const maker = params.maker.trim();
  const gradeId = params.gradeId.trim();
  const iso = params.iso;
  const breakerCode = params.breakerCode ?? null;
  const noseRmm = params.noseRmm ?? null;

  const all = await db.recommendations
    .where("maker")
    .equals(maker)
    .toArray();
  const candidates = all.filter(
    (r) => r.gradeId === gradeId && r.iso === iso
  );

  let best: RecommendationEntity | undefined;
  let bestScore = -1;

  for (const r of candidates) {
    let score = 0;
    const breakerMatches =
      breakerCode != null &&
      r.breakerCode != null &&
      r.breakerCode === breakerCode;
    const breakerGeneric = r.breakerCode == null;
    const noseMatches =
      noseRmm != null && r.noseRmm != null && r.noseRmm === noseRmm;
    const noseGeneric = r.noseRmm == null;

    // 1) grade+iso+breaker+nose 完全一致
    if (breakerMatches && noseMatches) score = 3;
    // 2) grade+iso+breaker（nose 汎用）
    else if (breakerMatches && noseGeneric) score = 2;
    // 3) grade+iso（breaker/nose 汎用）
    else if (breakerGeneric && noseGeneric) score = 1;
    else score = 0;

    if (score > bestScore) {
      best = r;
      bestScore = score;
    } else if (score === bestScore && best) {
      // 同スコアなら updatedAt が新しい方を優先
      if ((r.updatedAt ?? "") > (best.updatedAt ?? "")) {
        best = r;
      }
    }
  }

  return best;
}

