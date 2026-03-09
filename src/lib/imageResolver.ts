import noImageUrl from "../assets/no-image.png";

export type MakerFolder = "kyocera" | "tungaloy" | "mitsubishi" | "other";

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

