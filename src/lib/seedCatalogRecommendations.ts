import { db, type CatalogRecommendationEntity } from "./db";

const SEED_FLAG_KEY = "chiplog_seed_catalog_recommendations_v1";
const SEED_PR930_VNBR_V2_KEY = "chiplog_seed_catalog_pr930_vnbr_v2";

const KYOCERA_PV720_PDF_URL =
  "https://asia.kyocera.com/products/cuttingtools/wp-content/uploads/2015/03/CP343-1EN-TN620_PV720.pdf";

export async function ensureCatalogRecommendationsSeeded(): Promise<void> {
  if (typeof window === "undefined") return;

  const now = new Date().toISOString();

  if (window.localStorage.getItem(SEED_FLAG_KEY) !== "done") {
    const seed: CatalogRecommendationEntity = {
      id: "京セラ|PV720|P||*",
      maker: "京セラ",
      grade: "PV720",
      iso: "P",
      useTags: ["外径", "内径"],
      breaker: undefined,
      noseR: undefined,
      vcMin: 150,
      vcMax: 250,
      feedMin: 0.1,
      feedMax: 0.25,
      apMin: 0.5,
      apMax: 2,
      note: "鋼・仕上げ〜中切削（暫定）",
      source: "catalog",
      sourceUrl: KYOCERA_PV720_PDF_URL,
      createdAt: now,
      updatedAt: now,
    };
    await db.catalogRecommendations.put(seed);
    window.localStorage.setItem(SEED_FLAG_KEY, "done");
  }

  if (window.localStorage.getItem(SEED_PR930_VNBR_V2_KEY) !== "done") {
    const pr930VnbrSeeds: CatalogRecommendationEntity[] = [
      {
        id: "京セラ|PR930|P|VNBR03|*",
        maker: "京セラ",
        grade: "PR930",
        iso: "P",
        useTags: ["内径"],
        breaker: "VNBR03",
        noseR: undefined,
        vcMin: 30,
        vcMax: 100,
        feedMin: undefined,
        feedMax: 0.04,
        apMin: undefined,
        apMax: 0.4,
        note: "VNBR 推奨（湿式）",
        source: "catalog",
        sourceUrl: undefined,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "京セラ|PR930|P|VNBR04|*",
        maker: "京セラ",
        grade: "PR930",
        iso: "P",
        useTags: ["内径"],
        breaker: "VNBR04",
        noseR: undefined,
        vcMin: 30,
        vcMax: 100,
        feedMin: undefined,
        feedMax: 0.07,
        apMin: undefined,
        apMax: 0.45,
        note: "VNBR 推奨（湿式）",
        source: "catalog",
        sourceUrl: undefined,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "京セラ|PR930|P|VNBR06|*",
        maker: "京セラ",
        grade: "PR930",
        iso: "P",
        useTags: ["内径"],
        breaker: "VNBR06",
        noseR: undefined,
        vcMin: 30,
        vcMax: 100,
        feedMin: undefined,
        feedMax: 0.1,
        apMin: undefined,
        apMax: 0.5,
        note: "VNBR 推奨（湿式）",
        source: "catalog",
        sourceUrl: undefined,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "京セラ|PR930|M|VNBR03|*",
        maker: "京セラ",
        grade: "PR930",
        iso: "M",
        useTags: ["内径"],
        breaker: "VNBR03",
        noseR: undefined,
        vcMin: 30,
        vcMax: 80,
        feedMin: undefined,
        feedMax: 0.03,
        apMin: undefined,
        apMax: 0.4,
        note: "VNBR 推奨（湿式）",
        source: "catalog",
        sourceUrl: undefined,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "京セラ|PR930|M|VNBR04|*",
        maker: "京セラ",
        grade: "PR930",
        iso: "M",
        useTags: ["内径"],
        breaker: "VNBR04",
        noseR: undefined,
        vcMin: 30,
        vcMax: 80,
        feedMin: undefined,
        feedMax: 0.05,
        apMin: undefined,
        apMax: 0.45,
        note: "VNBR 推奨（湿式）",
        source: "catalog",
        sourceUrl: undefined,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "京セラ|PR930|M|VNBR06|*",
        maker: "京セラ",
        grade: "PR930",
        iso: "M",
        useTags: ["内径"],
        breaker: "VNBR06",
        noseR: undefined,
        vcMin: 30,
        vcMax: 80,
        feedMin: undefined,
        feedMax: 0.07,
        apMin: undefined,
        apMax: 0.5,
        note: "VNBR 推奨（湿式）",
        source: "catalog",
        sourceUrl: undefined,
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const entity of pr930VnbrSeeds) {
      await db.catalogRecommendations.put(entity);
    }
    window.localStorage.setItem(SEED_PR930_VNBR_V2_KEY, "done");
  }
}
