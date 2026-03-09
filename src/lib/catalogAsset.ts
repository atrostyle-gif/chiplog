/**
 * public/catalog/<makerSlug>/<code>.(pdf|jpg|png) の存在チェックとURL解決。
 * 複数枚対応: <code>_1.pdf, <code>_2.pdf ... または _1.jpg, _2.jpg ...
 * import.meta.glob は使わず、HEAD リクエストで確認する。
 */

const MAX_PAGES = 20;

export function getMakerSlug(maker: string): string {
  const name = (maker ?? "").trim();
  if (name === "京セラ") return "kyocera";
  if (name === "タンガロイ") return "tungaloy";
  if (name === "三菱") return "mitsubishi";
  return "other";
}

function contentTypeMatches(url: string, res: Response): boolean {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("text/html")) return false;
  if (ct === "") return true;
  if (url.toLowerCase().endsWith(".pdf")) return ct.includes("pdf");
  if (/\.(jpe?g|png|gif|webp)$/i.test(url)) return ct.includes("image");
  return true;
}

export async function checkUrlExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) {
      const ok = contentTypeMatches(url, res);
      if (ok) return true;
    }
    if (res.status === 405 || res.status === 404) {
      const getRes = await fetch(url, { method: "GET" });
      return getRes.ok && contentTypeMatches(url, getRes);
    }
    return false;
  } catch {
    try {
      const res = await fetch(url, { method: "GET" });
      return res.ok && contentTypeMatches(url, res);
    } catch {
      return false;
    }
  }
}

export type CatalogAsset = { url: string; type: "pdf" | "image"; index?: number };

/**
 * カタログ用のベース名。VNBR 系は型番によらず "VNBR" にまとめる（VNBR_1, VNBR_2 ...）。
 */
function getCatalogBaseName(code: string): string {
  const base = (code ?? "").trim();
  return /^VNBR/i.test(base) ? "VNBR" : base;
}

/**
 * 単一ファイル: <code>.pdf / .jpg / .png
 * 複数ファイル: <code>_1.pdf, <code>_2.pdf ... または _1.jpg, _2.jpg, _1.png ...
 * VNBR 系はベース名 "VNBR" で VNBR.pdf / VNBR_1.jpg 等を参照。
 * 優先: 単一PDF → 複数PDF → 単一画像 → 複数画像。見つかったものをすべて返す。
 */
export async function getCatalogAssets(
  maker: string,
  code: string
): Promise<CatalogAsset[]> {
  const slug = getMakerSlug(maker);
  const base = getCatalogBaseName((code ?? "").trim());
  if (!base) return [];

  const dir = `/catalog/${slug}`;
  const enc = encodeURIComponent(base);

  const singlePdf = `${dir}/${enc}.pdf`;
  if (await checkUrlExists(singlePdf)) return [{ url: singlePdf, type: "pdf" }];

  const multiPdf = await collectNumbered(dir, base, "pdf");
  if (multiPdf.length > 0) return multiPdf;

  const singleJpg = `${dir}/${enc}.jpg`;
  const singlePng = `${dir}/${enc}.png`;
  if (await checkUrlExists(singleJpg)) return [{ url: singleJpg, type: "image" }];
  if (await checkUrlExists(singlePng)) return [{ url: singlePng, type: "image" }];

  const multiJpg = await collectNumbered(dir, base, "jpg");
  const multiPng = await collectNumbered(dir, base, "png");
  if (multiJpg.length > 0) return multiJpg;
  if (multiPng.length > 0) return multiPng;

  return [];
}

async function collectNumbered(
  dir: string,
  base: string,
  ext: string
): Promise<CatalogAsset[]> {
  const type = ext === "pdf" ? "pdf" : "image";
  const out: CatalogAsset[] = [];
  for (let i = 1; i <= MAX_PAGES; i++) {
    const name = `${base}_${i}.${ext}`;
    const url = `${dir}/${encodeURIComponent(name)}`;
    if (await checkUrlExists(url)) out.push({ url, type, index: i });
    else if (i === 1) break;
  }
  return out;
}
