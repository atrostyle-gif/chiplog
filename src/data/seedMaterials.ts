import type { MaterialISO } from "../lib/conditionStore";

export type SeedMaterial = { name: string; iso: MaterialISO };

export const SEED_STEELS_P: SeedMaterial[] = [
  // 一般構造用
  { name: "SS400", iso: "P" },
  { name: "SS490", iso: "P" },

  // 板材系
  { name: "SPCC", iso: "P" },
  { name: "SPHC", iso: "P" },
  { name: "SPFC", iso: "P" },

  // 機械構造用炭素鋼
  { name: "S10C", iso: "P" },
  { name: "S15C", iso: "P" },
  { name: "S20C", iso: "P" },
  { name: "S25C", iso: "P" },
  { name: "S30C", iso: "P" },
  { name: "S35C", iso: "P" },
  { name: "S45C", iso: "P" },
  { name: "S50C", iso: "P" },
  { name: "S55C", iso: "P" },

  // 快削鋼
  { name: "SUM22", iso: "P" },
  { name: "SUM23", iso: "P" },
  { name: "SUM24L", iso: "P" },

  // 肌焼・合金鋼
  { name: "SCr420", iso: "P" },
  { name: "SCM415", iso: "P" },
  { name: "SCM420", iso: "P" },
  { name: "SCr440", iso: "P" },
  { name: "SCM435", iso: "P" },
  { name: "SCM440", iso: "P" },
  { name: "SNCM439", iso: "P" },

  // 軸受鋼
  { name: "SUJ2", iso: "P" },

  // 工具鋼
  { name: "SKS3", iso: "P" },
  { name: "SKD11", iso: "P" },
  { name: "SKD61", iso: "P" },

  // ばね鋼
  { name: "SUP9", iso: "P" },
  { name: "SUP10", iso: "P" },
];

export const SEED_STAINLESS_M: SeedMaterial[] = [
  { name: "SUS303", iso: "M" },
  { name: "SUS304", iso: "M" },
  { name: "SUS304L", iso: "M" },
  { name: "SUS316", iso: "M" },
  { name: "SUS316L", iso: "M" },
  { name: "SUS430", iso: "M" },
  { name: "SUS410", iso: "M" },
  { name: "SUS420J2", iso: "M" },
];

export const SEED_NONFERROUS_N: SeedMaterial[] = [
  { name: "A1050", iso: "N" },
  { name: "A1100", iso: "N" },
  { name: "A2017", iso: "N" },
  { name: "A2024", iso: "N" },
  { name: "A5052", iso: "N" },
  { name: "A6061", iso: "N" },
  { name: "A6063", iso: "N" },
  { name: "A7075", iso: "N" },
  { name: "C3604", iso: "N" },
  { name: "C3771", iso: "N" },
  { name: "C2801", iso: "N" },
  { name: "C1100", iso: "N" },
  { name: "C5191", iso: "N" },
];

export const SEED_CASTIRON_K: SeedMaterial[] = [
  { name: "FC200", iso: "K" },
  { name: "FC250", iso: "K" },
  { name: "FC300", iso: "K" },
  { name: "FCD400", iso: "K" },
  { name: "FCD450", iso: "K" },
  { name: "FCD500", iso: "K" },
  { name: "FCD600", iso: "K" },
  { name: "FCD700", iso: "K" },
];

/** v2 初回投入用: 鋼材P + ステンM + 非鉄N + 鋳鉄K */
export const SEED_ALL_V2: SeedMaterial[] = [
  ...SEED_STEELS_P,
  ...SEED_STAINLESS_M,
  ...SEED_NONFERROUS_N,
  ...SEED_CASTIRON_K,
];
