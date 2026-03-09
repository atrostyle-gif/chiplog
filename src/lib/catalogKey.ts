/**
 * 型番（model/code）からカタログ推奨検索用の breaker キーを推定する。
 * VNBR 系は型式キー（VNBR02 / VNBR03 / VNBR04 / VNBR05 / VNBR06 / VNBR07）として返す。
 * 空白は除去してから判定する。
 */
export function inferCatalogBreakerKeyFromModel(model: string): string | null {
  const s = (model ?? "").trim().replace(/\s/g, "").toUpperCase();
  if (!s) return null;
  if (/^VNBR02/.test(s)) return "VNBR02";
  if (/^VNBR03/.test(s)) return "VNBR03";
  if (/^VNBR04/.test(s)) return "VNBR04";
  if (/^VNBR05/.test(s)) return "VNBR05";
  if (/^VNBR06/.test(s)) return "VNBR06";
  if (/^VNBR07/.test(s)) return "VNBR07";
  return null;
}
