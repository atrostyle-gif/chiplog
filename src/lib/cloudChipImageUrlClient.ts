const LIST_CHIP_IMAGE_URLS = "/.netlify/functions/list-chip-image-urls";
const GET_CHIP_IMAGE_URL = "/.netlify/functions/get-chip-image-url";
const UPSERT_CHIP_IMAGE_URL = "/.netlify/functions/upsert-chip-image-url";

export interface ChipImageUrlItem {
  chip_id: string;
  image_url: string | null;
  updated_at: string;
}

export type ListChipImageUrlsResult =
  | { ok: true; items: ChipImageUrlItem[] }
  | { ok: false; error: string };

/**
 * クラウド（Turso）に保存されたチップ画像URL一覧を取得する。
 */
export async function fetchListChipImageUrls(): Promise<ListChipImageUrlsResult> {
  try {
    const res = await fetch(LIST_CHIP_IMAGE_URLS, { method: "GET" });
    const data = (await res.json()) as {
      success?: boolean;
      error?: string;
      items?: ChipImageUrlItem[];
    };
    if (!res.ok || data.success !== true) {
      return {
        ok: false,
        error: data.error ?? `HTTP ${res.status}`,
      };
    }
    const items = Array.isArray(data.items) ? data.items : [];
    return { ok: true, items };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Request failed",
    };
  }
}

/**
 * chip_id に対応するクラウド画像URLを Map に変換する。
 * undefined = 未取得、null = 取得済み・画像なし、string = 取得済み・画像あり の意味を維持する。
 */
export function chipImageUrlItemsToMap(
  items: ChipImageUrlItem[]
): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const item of items) {
    const url = item.image_url;
    map[item.chip_id] =
      url != null && typeof url === "string" && url.trim() !== ""
        ? url.trim()
        : null;
  }
  return map;
}

export type GetChipImageUrlResult =
  | { ok: true; image_url: string | null }
  | { ok: false; error: string };

/**
 * 指定 chip_id のクラウド画像URLを1件取得する。
 */
export async function fetchChipImageUrl(
  chipId: string
): Promise<GetChipImageUrlResult> {
  try {
    const url = `${GET_CHIP_IMAGE_URL}?chip_id=${encodeURIComponent(chipId)}`;
    const res = await fetch(url, { method: "GET" });
    const data = (await res.json()) as {
      success?: boolean;
      error?: string;
      image_url?: string | null;
    };
    if (!res.ok || data.success !== true) {
      return {
        ok: false,
        error: data.error ?? `HTTP ${res.status}`,
      };
    }
    return { ok: true, image_url: data.image_url ?? null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Request failed",
    };
  }
}

export type UpsertChipImageUrlResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * クラウド（Turso）にチップ画像URLを保存・更新する。imageUrl が null または空の場合は未設定として保存する。
 */
export async function upsertChipImageUrl(
  chipId: string,
  imageUrl: string | null
): Promise<UpsertChipImageUrlResult> {
  try {
    const res = await fetch(UPSERT_CHIP_IMAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chip_id: chipId,
        image_url:
          imageUrl == null ||
          (typeof imageUrl === "string" && imageUrl.trim() === "")
            ? null
            : imageUrl,
      }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || data.success !== true) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Request failed",
    };
  }
}
