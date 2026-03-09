import type { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { turso } from "./_lib/turso";

const STORE_NAME = "chiplog-chip-images";
const PREFIX = "chips/";
const MAX_DELETE = 50;

/** 自 store で発行した key 形式のみ許可: chips/<chipId>/<suffix> */
const VALID_KEY_REGEX = /^chips\/[^/]+\/.+$/;

/** serve-chip-image の path として許可する文字列（相対・絶対どちらでも pathname がこれに一致する想定） */
const SERVE_CHIP_IMAGE_PATH = "/.netlify/functions/serve-chip-image";

/**
 * 相対URLを解釈するための base URL。
 * image_url が "/.netlify/..." のような相対URLの場合、base がないと new URL() が例外になる。
 */
const FALLBACK_BASE_URL = "https://localhost";

const jsonHeaders = { "Content-Type": "application/json" };

/**
 * image_url から Blob key を抽出する（Node 環境用）。
 * 相対URL・絶対URLの両方に対応する。serve-chip-image の path かつ key が VALID_KEY_REGEX に一致する場合のみ返す。
 *
 * テスト観点（コメント）:
 * - 相対URL (e.g. "/.netlify/functions/serve-chip-image?key=chips/a/1.jpg") → key を返す
 * - 絶対URL (e.g. "https://site.com/.netlify/functions/serve-chip-image?key=chips/a/1.jpg") → key を返す
 * - path が serve-chip-image 以外 → null
 * - key クエリなし / key が VALID_KEY_REGEX に不一致 → null
 * - 形式不正 URL → null
 */
function getBlobKeyFromImageUrl(imageUrl: string): string | null {
  try {
    const u = new URL(imageUrl.trim(), FALLBACK_BASE_URL);
    if (u.pathname !== SERVE_CHIP_IMAGE_PATH) return null;
    const key = u.searchParams.get("key");
    if (!key || !VALID_KEY_REGEX.test(key)) return null;
    return key;
  } catch {
    return null;
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ success: false, error: "Method Not Allowed" }),
    };
  }

  const dryRun =
    event.queryStringParameters?.dryRun === "true" ||
    event.queryStringParameters?.dryRun === "1";

  try {
    // Step1: Turso から参照中の image_url を取得
    const result = await turso.execute(
      "SELECT image_url FROM chiplog_chip_images WHERE image_url IS NOT NULL"
    );
    const rows = result.rows as unknown as Array<{ image_url: string | null }>;

    // Step2 & Step3: image_url から key を抽出し activeKeys を構築（相対URLでも正しく key を取り出す）
    const activeKeys = new Set<string>();
    for (const row of rows) {
      const url = row.image_url;
      if (url != null && typeof url === "string" && url.trim() !== "") {
        const key = getBlobKeyFromImageUrl(url.trim());
        if (key) activeKeys.add(key);
      }
    }

    // Step4: Blob store の一覧取得（prefix: chips/）
    // Netlify Blobs: list() はデフォルトで全ページを自動取得し、1回で全件返す。paginate: true にしない限りページング不要。
    const store = getStore({
      name: STORE_NAME,
      consistency: "strong",
    });
    const { blobs } = await store.list({ prefix: PREFIX });

    // Step5: orphan 候補を特定（activeKeys に無く、かつ key 形式が有効なもののみ）
    const orphanCandidates: string[] = [];
    for (const blob of blobs) {
      const key = blob.key;
      if (!key || !key.startsWith(PREFIX)) continue;
      if (!VALID_KEY_REGEX.test(key)) continue;
      if (activeKeys.has(key)) continue;
      orphanCandidates.push(key);
    }

    const scanned = blobs.length;
    let deleted = 0;

    if (!dryRun && orphanCandidates.length > 0) {
      const toDelete = orphanCandidates.slice(0, MAX_DELETE);
      for (const key of toDelete) {
        try {
          await store.delete(key);
          deleted += 1;
        } catch (err) {
          console.error("[cleanup-orphan-blobs] delete failed for key:", key, err);
        }
      }
    }

    console.log("[cleanup-orphan-blobs] scanned:", scanned);
    console.log("[cleanup-orphan-blobs] orphanCandidates:", orphanCandidates.length);
    console.log("[cleanup-orphan-blobs] deleted:", deleted);
    console.log("[cleanup-orphan-blobs] dryRun:", dryRun);

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: true,
        scanned,
        orphanCandidates: orphanCandidates.length,
        deleted,
        dryRun,
      }),
    };
  } catch (err) {
    console.error("[cleanup-orphan-blobs] error:", err);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
    };
  }
};
