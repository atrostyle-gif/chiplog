/**
 * おすすめ条件の表示用型・ヘルパー。
 * ChipDetail および将来の CuttingLog で共通利用するためのデータ構造。
 */
import type { ConditionSet } from "./conditionStore";
import type { CatalogRecommendationEntity } from "./db";

export type RecommendedConditionSource = "shop" | "catalog" | "none";

/** 表示用おすすめ条件（回転数は現状 Vc で表示、将来 rpm を追加可能） */
export interface RecommendedConditionDisplay {
  source: RecommendedConditionSource;
  /** 回転数または周速（現状は Vc xx–yy m/min） */
  rpmOrVc: string;
  /** 送り（f xx–yy mm/rev） */
  feed: string;
  /** 切込み（ap xx–yy mm） */
  doc: string;
  /** クーラント（未登録時は "—"） */
  coolant: string;
  /** コメント */
  comment: string;
}

function formatRange(
  min?: number,
  max?: number,
  unit?: string
): string {
  const hasMin = min != null && !Number.isNaN(min);
  const hasMax = max != null && !Number.isNaN(max);
  if (!hasMin && !hasMax) return "—";
  const lo = hasMin ? String(min) : "—";
  const hi = hasMax ? String(max) : "—";
  const u = unit ? ` ${unit}` : "";
  return `${lo}–${hi}${u}`;
}

function buildFromConditionSet(set: ConditionSet): Omit<RecommendedConditionDisplay, "source"> {
  const hasVc = set.vcMin != null || set.vcMax != null;
  const hasFeed = set.feedMin != null || set.feedMax != null;
  const hasAp = set.apMin != null || set.apMax != null;
  return {
    rpmOrVc: hasVc
      ? `Vc ${formatRange(set.vcMin, set.vcMax, "m/min")}`
      : "—",
    feed: hasFeed
      ? formatRange(set.feedMin, set.feedMax, "mm/rev")
      : "—",
    doc: hasAp
      ? formatRange(set.apMin, set.apMax, "mm")
      : "—",
    coolant: "—",
    comment: set.note?.trim() ?? "—",
  };
}

function buildFromCatalogRec(
  rec: CatalogRecommendationEntity
): Omit<RecommendedConditionDisplay, "source"> {
  const hasVc = rec.vcMin != null || rec.vcMax != null;
  const hasFeed = rec.feedMin != null || rec.feedMax != null;
  const hasAp = rec.apMin != null || rec.apMax != null;
  return {
    rpmOrVc: hasVc
      ? `Vc ${formatRange(rec.vcMin, rec.vcMax, "m/min")}`
      : "—",
    feed: hasFeed
      ? formatRange(rec.feedMin, rec.feedMax, "mm/rev")
      : "—",
    doc: hasAp
      ? formatRange(rec.apMin, rec.apMax, "mm")
      : "—",
    coolant: "—",
    comment: rec.note?.trim() ?? "—",
  };
}

function hasAnyConditionSet(set: ConditionSet | undefined): boolean {
  if (!set) return false;
  const has =
    (set.vcMin != null && !Number.isNaN(set.vcMin)) ||
    (set.vcMax != null && !Number.isNaN(set.vcMax)) ||
    (set.feedMin != null && !Number.isNaN(set.feedMin)) ||
    (set.feedMax != null && !Number.isNaN(set.feedMax)) ||
    (set.apMin != null && !Number.isNaN(set.apMin)) ||
    (set.apMax != null && !Number.isNaN(set.apMax)) ||
    (set.note != null && String(set.note).trim() !== "");
  return has;
}

/**
 * 社内推奨 → メーカー推奨 の優先順位で 1 件の表示用おすすめ条件を返す。
 */
export function getRecommendedConditionDisplay(
  shop: ConditionSet | undefined,
  catalogRec: CatalogRecommendationEntity | undefined
): RecommendedConditionDisplay {
  if (hasAnyConditionSet(shop)) {
    return { ...buildFromConditionSet(shop!), source: "shop" };
  }
  if (catalogRec && hasAnyConditionSet(catalogRec as unknown as ConditionSet)) {
    return { ...buildFromCatalogRec(catalogRec), source: "catalog" };
  }
  return {
    source: "none",
    rpmOrVc: "—",
    feed: "—",
    doc: "—",
    coolant: "—",
    comment: "—",
  };
}
