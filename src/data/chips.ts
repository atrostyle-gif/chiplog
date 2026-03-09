import {
  parseBreakerFromCode,
  parseNoseRmmFromCode,
  parseShapeFromCode,
} from "../lib/chipCodeParser";
import { resolveChipImageUrl } from "../lib/imageResolver";

export type Machine = "CITIZEN" | "NC" | "MINI" | "MC";
export type Material = "P" | "M" | "N" | "K" | "S" | "H";
export type Use = "外径" | "内径" | "溝" | "突切" | "ネジ" | "リア";
export type NoseR = "0.2" | "0.4" | "0.8";

export interface Chip {
  id: string;
  /** メーカー（必須・将来の発注依頼で使用） */
  maker: string;
  code: string;
  /** 材種ID（Gradeマスタ参照） */
  gradeId: string;
  /** 用途（複数） */
  uses: Use[];
  /** 被削材 ISO（複数）。空のときは grade.recommendedMaterials を表示に使用 */
  materials: Material[];
  /** 刃先R mm（0.2/0.4/0.8） */
  noseRmm: number | null;
  /** フィルター用（noseRmm から導出） */
  noseR: NoseR[];
  /** ブレーカーコード（Breakerマスタ参照: getBreaker(maker, breakerCode)） */
  breakerCode: string | null;
  /** 形状キー（フィルタや集計用の内部キー） */
  shapeKey: string;
  /** 形状ラベル（画面表示用） */
  shapeLabel: string;
  /** チップ画像URL（存在しなければ no-image） */
  imageUrl: string;
  machines: Machine[];
  features: string[];
  applications: string[];
}

const DEFAULT_MACHINES: Machine[] = ["CITIZEN", "NC", "MINI", "MC"];

function chipId(maker: string, code: string): string {
  return `${maker}:${code.trim()}`;
}

interface ChipRow {
  maker: string;
  code: string;
  gradeId: string;
  uses?: Use[];
  materials?: Material[];
  /** 旧データ互換用（現在は利用しない） */
  noseR?: number | null;
  /** 旧データ互換用（現在は利用しない） */
  breakerCode?: string | null;
}

function buildChip(row: ChipRow): Chip {
  const maker = row.maker.trim();
  const code = row.code.trim();
  const noseRmm = parseNoseRmmFromCode(code);
  const noseR: NoseR[] =
    noseRmm !== null ? [noseRmm.toFixed(1) as NoseR] : [];
  const breakerCode = parseBreakerFromCode(code);
  const shape = parseShapeFromCode(code);
  const imageUrl = resolveChipImageUrl(maker, code);

  return {
    id: chipId(maker, code),
    maker,
    code,
    gradeId: row.gradeId,
    uses: row.uses ?? [],
    materials: row.materials ?? [],
    noseRmm,
    noseR,
    breakerCode,
    shapeKey: shape.key,
    shapeLabel: shape.label,
    imageUrl,
    machines: DEFAULT_MACHINES,
    features: [],
    applications: [],
  };
}

const CHIP_DATA: ChipRow[] = [
  {
    maker: "タンガロイ",
    code: "DCMT11T302-PS",
    uses: ["外径", "内径"],
    materials: ["P", "M"],
    noseR: 0.2,
    breakerCode: "PS",
    gradeId: "AH6235",
  },
  {
    maker: "タンガロイ",
    code: "DCMT11T304-PSS",
    uses: ["外径", "内径"],
    materials: ["P", "M"],
    noseR: 0.4,
    breakerCode: "PSS",
    gradeId: "AH6235",
  },
  {
    maker: "タンガロイ",
    code: "JXBR8010F",
    uses: ["溝", "突切"],
    materials: ["P", "M"],
    noseR: null,
    breakerCode: null,
    gradeId: "J740",
  },
  {
    maker: "京セラ",
    code: "DCMT11T304GK",
    uses: ["外径", "内径"],
    materials: ["P"],
    noseR: 0.4,
    breakerCode: "GK",
    gradeId: "PV720",
  },
  {
    maker: "京セラ",
    code: "DCMT11T304HQ",
    uses: ["外径", "内径"],
    materials: ["P"],
    noseR: 0.4,
    breakerCode: "HQ",
    gradeId: "PV720",
  },
  {
    maker: "京セラ",
    code: "DCGT11T304MFP",
    uses: ["外径", "内径"],
    materials: ["M"],
    noseR: 0.4,
    breakerCode: "MFP",
    gradeId: "PR1225",
  },
  {
    maker: "京セラ",
    code: "GDM2020N-015PF",
    uses: ["溝"],
    materials: ["M", "S"],
    noseR: null,
    breakerCode: "PF",
    gradeId: "PR1535",
  },
  {
    maker: "京セラ",
    code: "TNGG16402R-S",
    uses: ["外径", "内径"],
    materials: ["P"],
    noseR: 0.2,
    breakerCode: "S",
    gradeId: "PV720",
  },
  {
    maker: "京セラ",
    code: "TNGG16404R-S",
    uses: ["外径", "内径"],
    materials: ["P"],
    noseR: 0.4,
    breakerCode: "S",
    gradeId: "PV720",
  },
  {
    maker: "京セラ",
    code: "VNBR0320-02",
    uses: ["溝", "突切"],
    materials: ["P"],
    noseR: 0.2,
    breakerCode: null,
    gradeId: "PR930",
  },
  {
    maker: "京セラ",
    code: "VNBR0420-02",
    uses: ["溝", "突切"],
    materials: ["P"],
    noseR: 0.2,
    breakerCode: null,
    gradeId: "PR930",
  },
  {
    maker: "京セラ",
    code: "VNBR0620-02",
    uses: ["溝", "突切"],
    materials: ["P"],
    noseR: 0.2,
    breakerCode: null,
    gradeId: "PR930",
  },
  {
    maker: "京セラ",
    code: "VNBR0311-02",
    uses: ["溝", "突切"],
    materials: ["P"],
    noseR: 0.2,
    breakerCode: null,
    gradeId: "PR930",
  },
  {
    maker: "京セラ",
    code: "VNBR0411-02",
    uses: ["溝", "突切"],
    materials: ["P"],
    noseR: 0.2,
    breakerCode: null,
    gradeId: "PR930",
  },
  {
    maker: "京セラ",
    code: "VNBR0611-02",
    uses: ["溝", "突切"],
    materials: ["P"],
    noseR: 0.2,
    breakerCode: null,
    gradeId: "PR930",
  },
  {
    maker: "京セラ",
    code: "TPGH090202L",
    uses: ["外径", "内径"],
    materials: ["P"],
    noseR: 0.2,
    breakerCode: null,
    gradeId: "PV720",
  },
  {
    maker: "京セラ",
    code: "TPGH090204L",
    uses: ["外径", "内径"],
    materials: ["P"],
    noseR: 0.4,
    breakerCode: null,
    gradeId: "PV720",
  },
  {
    maker: "京セラ",
    code: "TPGH110302L",
    uses: ["外径", "内径"],
    materials: ["P"],
    noseR: 0.2,
    breakerCode: null,
    gradeId: "PV720",
  },
  {
    maker: "京セラ",
    code: "TPGH110304L",
    uses: ["外径", "内径"],
    materials: ["P"],
    noseR: 0.4,
    breakerCode: null,
    gradeId: "PV720",
  },
  {
    maker: "京セラ",
    code: "TNMG16402MQ",
    uses: ["外径", "内径"],
    materials: ["M", "S"],
    noseR: 0.2,
    breakerCode: "MQ",
    gradeId: "PR1535",
  },
  {
    maker: "京セラ",
    code: "TNMG16404MQ",
    uses: ["外径", "内径"],
    materials: ["M", "S"],
    noseR: 0.4,
    breakerCode: "MQ",
    gradeId: "PR1535",
  },
  {
    maker: "京セラ",
    code: "TNMG160408PG",
    uses: ["外径", "内径"],
    materials: ["M", "S"],
    noseR: 0.8,
    breakerCode: "PG",
    gradeId: "PR1535",
  },
  {
    maker: "京セラ",
    code: "CNMG120408PG",
    uses: ["外径", "内径"],
    materials: ["M", "S"],
    noseR: 0.8,
    breakerCode: "PG",
    gradeId: "PR1535",
  },
  {
    maker: "三菱",
    code: "TPMH090202-MV",
    uses: ["外径", "内径"],
    materials: ["P", "M", "K", "S"],
    noseR: 0.2,
    breakerCode: "MV",
    gradeId: "VP15TF",
  },
  {
    maker: "三菱",
    code: "TPMH090204-MV",
    uses: ["外径", "内径"],
    materials: ["P", "M", "K", "S"],
    noseR: 0.4,
    breakerCode: "MV",
    gradeId: "VP15TF",
  },
  {
    maker: "三菱",
    code: "TPMH110302-MV",
    uses: ["外径", "内径"],
    materials: ["P", "M", "K", "S"],
    noseR: 0.2,
    breakerCode: "MV",
    gradeId: "VP15TF",
  },
  {
    maker: "三菱",
    code: "TPMH110304-MV",
    uses: ["外径", "内径"],
    materials: ["P", "M", "K", "S"],
    noseR: 0.4,
    breakerCode: "MV",
    gradeId: "VP15TF",
  },
  {
    maker: "三菱",
    code: "TNGG16402-F",
    uses: ["外径", "内径"],
    materials: ["P", "M", "K", "S"],
    noseR: 0.2,
    breakerCode: "F",
    gradeId: "VP15TF",
  },
  {
    maker: "三菱",
    code: "TNGG16404-F",
    uses: ["外径", "内径"],
    materials: ["P", "M", "K", "S"],
    noseR: 0.4,
    breakerCode: "F",
    gradeId: "VP15TF",
  },
  {
    maker: "三菱",
    code: "DCMT11T304-MV",
    uses: ["外径", "内径"],
    materials: ["P", "M", "K", "S"],
    noseR: 0.4,
    breakerCode: "MV",
    gradeId: "VP15TF",
  },
];

export const chips: Chip[] = CHIP_DATA.map(buildChip);

export function getChipById(id: string): Chip | undefined {
  return chips.find((c) => c.id === id);
}
