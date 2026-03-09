const UPLOAD_CHIP_IMAGE_URL = "/.netlify/functions/upload-chip-image";
const DELETE_CHIP_IMAGE_BLOB_URL = "/.netlify/functions/delete-chip-image-blob";

/** 自 store で発行した key 形式のみ許可: chips/<chipId>/<suffix> */
const VALID_BLOB_KEY_REGEX = /^chips\/[^/]+\/.+$/;

/**
 * serve-chip-image の image_url から Blob key を取り出す。
 * 形式が一致しない場合は null（削除しない）。
 */
export function getBlobKeyFromImageUrl(imageUrl: string): string | null {
  try {
    const u = new URL(imageUrl, window.location.origin);
    if (!u.pathname.includes("serve-chip-image")) return null;
    const key = u.searchParams.get("key");
    if (!key || !VALID_BLOB_KEY_REGEX.test(key)) return null;
    return key;
  } catch {
    return null;
  }
}

export type DeleteChipImageBlobResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * 指定 key の Blob を削除する。参照解除後に呼ぶ想定。
 */
export async function deleteChipImageBlob(
  key: string
): Promise<DeleteChipImageBlobResult> {
  try {
    const res = await fetch(DELETE_CHIP_IMAGE_BLOB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (res.ok && data.success === true) return { ok: true };
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Request failed",
    };
  }
}

export type UploadChipImageResult =
  | { success: true; imageUrl: string }
  | { success: false; error: string };

/**
 * チップ画像を Netlify Blobs にアップロードし、配信用 imageUrl を返す。
 */
export async function uploadChipImage(
  chipId: string,
  file: File
): Promise<UploadChipImageResult> {
  const base64 = await fileToBase64(file);
  const contentType = file.type || "image/jpeg";

  try {
    const res = await fetch(UPLOAD_CHIP_IMAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chipId,
        data: base64,
        contentType,
      }),
    });
    const data = (await res.json()) as {
      success?: boolean;
      error?: string;
      imageUrl?: string;
    };
    if (!res.ok || data.success !== true) {
      const msg = data.error ?? `HTTP ${res.status}`;
      return { success: false, error: msg };
    }
    if (!data.imageUrl || typeof data.imageUrl !== "string") {
      return { success: false, error: "No imageUrl in response" };
    }
    return { success: true, imageUrl: data.imageUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return { success: false, error: msg };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
