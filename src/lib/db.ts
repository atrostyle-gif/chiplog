import Dexie from "dexie";
import type { MaterialISO } from "./conditionStore";

export interface MaterialEntity {
  id: string;
  name: string;
  iso?: MaterialISO;
  createdAt: string;
}

export interface PersonEntity {
  id: string;
  name: string;
  createdAt: string;
}

export type CloudSyncStatus = "local_only" | "synced" | "sync_error";

export interface LogEntity {
  id: string;
  date: string;
  chipId: string;
  materialId: string;
  materialName: string;
  writerId: string;
  writerName: string;
  company: string;
  productName: string;
  productNo: string;
  internalSerial: string;
  rpm: number;
  feed: number;
  doc: number;
  memo: string;
  iso?: MaterialISO;
  createdAt: string;
  updatedAt: string;
  /** クラウド同期状態。未設定の既存ログは "local_only" 扱い */
  cloudSyncStatus?: CloudSyncStatus;
  /** クラウド同期成功日時（ISO） */
  cloudSyncedAt?: string | null;
  /** 同期失敗時のエラーメッセージ */
  cloudSyncErrorMessage?: string | null;
}

export interface CompanyEntity {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface ChipEntity {
  id: string;
  maker: string;
  code: string;
  gradeId: string;
  uses: string[];
  materials: string[];
  machines: string[];
  features?: string[];
  applications?: string[];
  shapeLabelOverride?: string;
  noseRmm?: number | null;
  breakerCode?: string | null;
  /** 画像パス（例: chips/VNBR0320-02.jpg）。指定時は /${imagePath} で表示 */
  imagePath?: string;
  /** クラウド画像URL（Netlify Blobs 配信URL）。指定時はこちらを優先表示 */
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GradeEntity {
  id: string;
  maker?: string;
  name: string;
  coatingShort: string;
  coatingDetail: string;
  recommendedMaterials: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BreakerEntity {
  id: string;
  maker: string;
  code: string;
  name: string;
  detail: string;
  typicalUses: string[];
  sourceNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationEntity {
  id: string;
  maker: string;
  gradeId: string;
  iso: MaterialISO;
  breakerCode?: string | null;
  noseRmm?: number | null;
  vcMin?: number;
  vcMax?: number;
  feedMin?: number;
  feedMax?: number;
  apMin?: number;
  apMax?: number;
  note?: string;
  source?: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogRecommendationEntity {
  id: string;
  maker: string;
  grade: string;
  iso: MaterialISO;
  useTags: string[];
  breaker?: string;
  noseR?: number;
  vcMin?: number;
  vcMax?: number;
  feedMin?: number;
  feedMax?: number;
  apMin?: number;
  apMax?: number;
  note?: string;
  source: "catalog";
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogSearchFilters {
  keyword?: string;
  materialId?: string;
  writerId?: string;
  chipId?: string;
  dateFrom?: string;
  dateTo?: string;
}

class ChiplogDB extends Dexie {
  materials!: Dexie.Table<MaterialEntity, string>;
  people!: Dexie.Table<PersonEntity, string>;
  logs!: Dexie.Table<LogEntity, string>;
  companies!: Dexie.Table<CompanyEntity, string>;
  chips!: Dexie.Table<ChipEntity, string>;
  grades!: Dexie.Table<GradeEntity, string>;
  breakers!: Dexie.Table<BreakerEntity, string>;
  recommendations!: Dexie.Table<RecommendationEntity, string>;
  catalogRecommendations!: Dexie.Table<CatalogRecommendationEntity, string>;

  constructor() {
    super("chiplog-db");
    this.version(1).stores({
      materials: "id, name, createdAt",
      people: "id, name, createdAt",
      logs: "id, date, chipId, materialId, writerId, createdAt, updatedAt",
    });
    this.version(2).stores({
      materials: "id, name, iso, createdAt",
      people: "id, name, createdAt",
      logs: "id, date, chipId, materialId, writerId, iso, createdAt, updatedAt",
    });
    this.version(3).stores({
      materials: "id, name, iso, createdAt",
      people: "id, name, createdAt",
      logs: "id, date, chipId, materialId, writerId, iso, createdAt, updatedAt",
      companies: "id, name, createdAt",
    });
    this.version(4).stores({
      materials: "id, name, iso, createdAt",
      people: "id, name, createdAt",
      logs: "id, date, chipId, materialId, writerId, iso, createdAt, updatedAt",
      companies: "id, name, lastUsedAt, createdAt",
    });
    this.version(5).stores({
      materials: "id, name, iso, createdAt",
      people: "id, name, createdAt",
      logs: "id, date, chipId, materialId, writerId, iso, createdAt, updatedAt",
      companies: "id, name, lastUsedAt, createdAt",
      chips: "id, maker, code, gradeId, updatedAt",
      grades: "id, updatedAt",
      breakers: "id, maker, code, updatedAt",
    });
    this.version(6).stores({
      materials: "id, name, iso, createdAt",
      people: "id, name, createdAt",
      logs: "id, date, chipId, materialId, writerId, iso, createdAt, updatedAt",
      companies: "id, name, lastUsedAt, createdAt",
      chips: "id, maker, code, gradeId, updatedAt",
      grades: "id, updatedAt",
      breakers: "id, maker, code, updatedAt",
      recommendations: "id, maker, gradeId, iso, breakerCode, updatedAt",
    });
    this.version(7).stores({
      materials: "id, name, iso, createdAt",
      people: "id, name, createdAt",
      logs: "id, date, chipId, materialId, writerId, iso, createdAt, updatedAt",
      companies: "id, name, lastUsedAt, createdAt",
      chips: "id, maker, code, gradeId, updatedAt",
      grades: "id, updatedAt",
      breakers: "id, maker, code, updatedAt",
      recommendations: "id, maker, gradeId, iso, breakerCode, updatedAt",
      catalogRecommendations: "id, maker, grade, iso, breaker, updatedAt",
    });
  }
}

export const db = new ChiplogDB();
