export type Use = "外径" | "内径" | "溝" | "突切" | "ネジ" | "リア";

export type Breaker = {
  id: string;
  maker: string;
  code: string;
  name: string;
  detail: string;
  typicalUses: Use[];
  /** 出典・公式記述に差し替え時のメモ（後から更新可能） */
  sourceNote?: string;
};

export const BREAKERS: Breaker[] = [
  {
    id: "タンガロイ:PS",
    maker: "タンガロイ",
    code: "PS",
    name: "PS",
    detail:
      "仕上げ〜軽切削向け。\n切れ味重視で切りくず処理を安定させやすい。（暫定・現場メモ）",
    typicalUses: ["外径", "内径"],
  },
  {
    id: "タンガロイ:PSS",
    maker: "タンガロイ",
    code: "PSS",
    name: "PSS",
    detail: "微小切込みの仕上げ寄り。\n面品位重視。（暫定・現場メモ）",
    typicalUses: ["外径", "内径"],
  },
  {
    id: "京セラ:GK",
    maker: "京セラ",
    code: "GK",
    name: "GK",
    detail:
      "鋼の仕上げ〜軽切削寄り。\n安定した切りくず処理を狙う。（暫定・現場メモ）",
    typicalUses: ["外径", "内径"],
  },
  {
    id: "京セラ:HQ",
    maker: "京セラ",
    code: "HQ",
    name: "HQ",
    detail: "鋼の軽切削・仕上げ寄り。\n低抵抗で安定。（暫定・現場メモ）",
    typicalUses: ["外径", "内径"],
  },
  {
    id: "京セラ:MFP",
    maker: "京セラ",
    code: "MFP",
    name: "MFP",
    detail:
      "ステンレス寄りの仕上げ〜中切削。\n溶着抑制を狙う。（暫定・現場メモ）",
    typicalUses: ["外径", "内径"],
  },
  {
    id: "京セラ:MQ",
    maker: "京セラ",
    code: "MQ",
    name: "MQ",
    detail:
      "ステンレス/難削寄りの中切削。\n欠損抑制と切りくず処理のバランス。（暫定・現場メモ）",
    typicalUses: ["外径", "内径"],
  },
  {
    id: "京セラ:PG",
    maker: "京セラ",
    code: "PG",
    name: "PG",
    detail: "中〜荒寄り。\n強度と切りくず処理のバランス。（暫定・現場メモ）",
    typicalUses: ["外径", "内径"],
  },
  {
    id: "京セラ:PF",
    maker: "京セラ",
    code: "PF",
    name: "PF",
    detail: "溝入れ用（GDM系）。\n切りくず処理重視。（暫定・現場メモ）",
    typicalUses: ["溝"],
  },
  {
    id: "京セラ:S",
    maker: "京セラ",
    code: "S",
    name: "S",
    detail:
      "仕上げ寄り。\n後でカタログに合わせて更新予定。（暫定・現場メモ）",
    typicalUses: ["外径", "内径"],
  },
  {
    id: "三菱:MV",
    maker: "三菱",
    code: "MV",
    name: "MV",
    detail: "中切削の汎用。\n切りくず処理と強度のバランス。（暫定・現場メモ）",
    typicalUses: ["外径", "内径"],
  },
  {
    id: "三菱:F",
    maker: "三菱",
    code: "F",
    name: "F",
    detail: "仕上げ寄り。\n低抵抗で面品位重視。（暫定・現場メモ）",
    typicalUses: ["外径", "内径"],
  },
];

export function getBreaker(maker: string, code: string): Breaker | null {
  const id = `${maker}:${code}`;
  const b = BREAKERS.find((x) => x.id === id);
  return b ?? null;
}
