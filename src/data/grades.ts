export type MaterialISO = "P" | "M" | "N" | "K" | "S" | "H";

export type Grade = {
  id: string;
  maker?: string;
  name: string;
  coatingShort: string;
  coatingDetail: string;
  recommendedMaterials: MaterialISO[];
  note?: string;
};

export const GRADES: Grade[] = [
  {
    id: "AH6235",
    maker: "タンガロイ",
    name: "AH6235",
    coatingShort: "PVD（高Alナノ多層 AlTiN）",
    coatingDetail:
      "PVD：高Alナノ多層（AlTiN）で硬度向上（耐摩耗）。\n多層構造で微小クラック進展を抑え、欠損に強い。\n専用のタフ母材で断続にも安定。",
    recommendedMaterials: ["P", "M"],
  },
  {
    id: "PV720",
    maker: "京セラ",
    name: "PV720",
    coatingShort: "サーメット + MEGACOAT NANO（外層TiN）",
    coatingDetail:
      "鋼加工用サーメットに MEGACOAT NANO を適用。\n耐摩耗・耐溶着に強く、高能率加工と仕上げ面品位を両立。\n最外層に特殊TiNコート。",
    recommendedMaterials: ["P"],
  },
  {
    id: "PR1535",
    maker: "京セラ",
    name: "PR1535",
    coatingShort: "MEGACOAT NANO（PVD）",
    coatingDetail:
      "特殊ナノ積層コーティング MEGACOAT NANO により長寿命・安定。\nタフ母材＋耐熱コートで欠損に強く、ステンレス/難削材向け。\n（資料記載例）高硬度（約35GPa）・酸化温度 1150°C。",
    recommendedMaterials: ["M", "S"],
  },
  {
    id: "PR1225",
    maker: "京セラ",
    name: "PR1225",
    coatingShort: "MEGACOAT（PVD）",
    coatingDetail:
      "MEGACOAT：高い密着強度＋薄膜/平滑でシャープエッジを維持。\nステンレス向けの汎用グレード。",
    recommendedMaterials: ["M"],
  },
  {
    id: "PR930",
    maker: "京セラ",
    name: "PR930",
    coatingShort: "TiCN（PVD）",
    coatingDetail:
      "高硬度TiCNコート＋超微粒母材。\n低速域・シャープエッジの精密加工に適用。",
    recommendedMaterials: ["P"],
  },
  {
    id: "J740",
    maker: "タンガロイ",
    name: "J740",
    coatingShort: "TiN（PVD）",
    coatingDetail:
      "TiN（PVD）。\n溝/突切系で使われることが多い（P/M向け）。\n※後でメーカー一次資料が見つかれば差し替え。",
    recommendedMaterials: ["P", "M"],
  },
  {
    id: "VP15TF",
    maker: "三菱",
    name: "VP15TF",
    coatingShort: "PVD（(Al,Ti)N系 / MIRACLE系）",
    coatingDetail:
      "PVDの(Al,Ti)N系コーティングで耐熱性・密着強度を高める、という技術説明。\nシャープエッジのコーテッド超硬に適用可能（PVDの特性）。",
    recommendedMaterials: ["P", "M", "K", "S"],
  },
];

export function getGradeById(id: string): Grade | null {
  const g = GRADES.find((x) => x.id === id);
  return g ?? null;
}
