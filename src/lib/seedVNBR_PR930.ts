import { VNBR_CHIP_SEEDS, VNBR_CATALOG_SEEDS } from "../data/seedVNBR_PR930";
import { upsertChip } from "./chipStore";
import { upsertCatalogRecommendation } from "./catalogRecommendationStore";

const SEED_FLAG_KEY = "chiplog_seed_vnbr_pr930_v1";
const SEED_IMAGE_PATH_FIX_V2_KEY = "chiplog_seed_vnbr_pr930_imagepath_fix_v2";

export async function runSeedVNBR_PR930_IfNeeded(): Promise<void> {
  if (typeof window === "undefined") return;

  if (window.localStorage.getItem(SEED_FLAG_KEY) !== "done") {
    for (const row of VNBR_CHIP_SEEDS) {
      await upsertChip({
        id: row.id,
        maker: row.maker,
        code: row.code,
        gradeId: row.gradeId,
        uses: row.uses,
        materials: row.materials,
        machines: row.machines,
        noseRmm: row.noseRmm ?? null,
        breakerCode: row.breakerCode ?? null,
        imagePath: undefined,
      });
    }
    for (const rec of VNBR_CATALOG_SEEDS) {
      await upsertCatalogRecommendation({
        id: rec.id,
        maker: rec.maker,
        grade: rec.grade,
        iso: rec.iso,
        useTags: rec.useTags ?? [],
        breaker: rec.breaker,
        noseR: rec.noseR,
        vcMin: rec.vcMin,
        vcMax: rec.vcMax,
        feedMin: rec.feedMin,
        feedMax: rec.feedMax,
        apMin: rec.apMin,
        apMax: rec.apMax,
        note: rec.note,
        source: rec.source,
        sourceUrl: rec.sourceUrl,
      });
    }
    window.localStorage.setItem(SEED_FLAG_KEY, "done");
  }

  if (window.localStorage.getItem(SEED_IMAGE_PATH_FIX_V2_KEY) !== "done") {
    for (const row of VNBR_CHIP_SEEDS) {
      await upsertChip({
        id: row.id,
        maker: row.maker,
        code: row.code,
        gradeId: row.gradeId,
        uses: row.uses,
        materials: row.materials,
        machines: row.machines,
        noseRmm: row.noseRmm ?? null,
        breakerCode: row.breakerCode ?? null,
        imagePath: undefined,
      });
    }
    window.localStorage.setItem(SEED_IMAGE_PATH_FIX_V2_KEY, "done");
  }
}
