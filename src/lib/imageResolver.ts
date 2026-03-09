import noImageUrl from "../assets/no-image.png";

export type MakerFolder = "kyocera" | "tungaloy" | "mitsubishi" | "other";

/**
 * 一覧・詳細で共通の画像表示URL解決。
 * 優先順: クラウド保存済みURL > ローカル/シードURL > プレースホルダー。
 * @param cloudUrl undefined=未取得, null=取得済み・画像なし, string=取得済み・画像あり
 * @param localUrl chip.imageUrl（Dexie 由来の解決済みURL）
 * @param noImageFallback 画像がないときのフォールバックURL
 */
export function getDisplayImageUrl(
  cloudUrl: undefined | null | string,
  localUrl: string,
  noImageFallback: string
): string {
  if (cloudUrl !== undefined && cloudUrl !== null) return cloudUrl;
  return localUrl || noImageFallback;
}

export function makerFolder(maker: string): MakerFolder {
  const name = maker.trim();
  if (name === "京セラ") return "kyocera";
  if (name === "タンガロイ") return "tungaloy";
  if (name === "三菱") return "mitsubishi";
  return "other";
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "svg"] as const;

const IMAGES = import.meta.glob<string>(
  "../assets/inserts/**/*.{png,jpg,jpeg,webp,svg}",
  {
    eager: true,
    as: "url",
  }
) as Record<string, string>;

export function resolveChipImageUrl(maker: string, code: string): string {
  const folder = makerFolder(maker);
  const trimmedCode = code.trim();
  if (!trimmedCode) return noImageUrl;

  for (const ext of IMAGE_EXTENSIONS) {
    const key = `../assets/inserts/${folder}/${trimmedCode}.${ext}`;
    const url = IMAGES[key];
    if (url) return url;
  }

  return noImageUrl;
}

