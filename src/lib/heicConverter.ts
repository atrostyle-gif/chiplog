/**
 * HEIC/HEIF を JPEG に変換する。
 * スマホカメラ（iPhone 等）のアップロード失敗を防ぐため、アップロード前に通す。
 */
import heic2any from "heic2any";

const HEIC_TYPES = /^image\/(heic|heif)$/i;

/**
 * HEIC/HEIF の場合は JPEG に変換して返す。それ以外はそのまま返す。
 */
export async function convertIfHeic(file: File): Promise<File> {
  const type = (file.type || "").toLowerCase();
  if (!HEIC_TYPES.test(type)) return file;

  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  const name = file.name.replace(/\.[^.]+$/i, ".jpg");
  return new File([blob], name, { type: "image/jpeg" });
}
