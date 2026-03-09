import { SEED_ALL_V2 } from "../data/seedMaterials";
import { addMaterial } from "./materialStore";

const SEED_FLAG = "chiplog_seed_materials_v2";

/**
 * 材質マスタ初期投入（v2: 鋼P + ステンM + 非鉄N + 鋳鉄K）。
 * SEED_FLAG が未設定の場合のみ実行。addMaterial の重複吸収・iso アップグレードに任せる。
 */
export async function runSeedMaterialsIfNeeded(): Promise<void> {
  try {
    if (localStorage.getItem(SEED_FLAG) === "1") return;
    for (const item of SEED_ALL_V2) {
      await addMaterial(item.name, item.iso);
    }
    localStorage.setItem(SEED_FLAG, "1");
  } catch {
    // 失敗してもアプリは継続。次回再試行可能
  }
}
