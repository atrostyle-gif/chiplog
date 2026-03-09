/**
 * 材質名の比較用キー（英数字は大文字、スペース・ハイフン・アンダースコア除去）
 * 例: "sus303" / "SUS303" / "SUS-303" → 同一視
 */
export function materialNormalizeKey(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]/g, "");
}

/**
 * 記入者名の比較用キー（トリム＋連続スペース除去）
 */
export function personNormalizeKey(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "");
}

/**
 * 社名の比較用キー（トリム、連続スペース1つ、大文字化、スペース・ハイフン等除去）
 */
export function companyNormalizeKey(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase()
    .replace(/[\s\-_]/g, "");
}
