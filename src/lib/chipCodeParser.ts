export function parseNoseRmmFromCode(code: string): number | null {
  const upper = code.toUpperCase().trim();

  // VNBR****-02 系は R ではない可能性が高いので推定しない
  if (/^VNBR.+-0[248]$/.test(upper)) {
    return null;
  }

  // 末尾付近の 02 / 04 / 08 を検出（例: DCMT11T304, TNMG160408）
  const match = upper.match(/(0[248])(?=[^0-9]*$)/);
  if (!match) return null;

  switch (match[1]) {
    case "02":
      return 0.2;
    case "04":
      return 0.4;
    case "08":
      return 0.8;
    default:
      return null;
  }
}

export function parseBreakerFromCode(code: string): string | null {
  const upper = code.toUpperCase().trim();
  const hyphenIndex = upper.lastIndexOf("-");
  if (hyphenIndex === -1) return null;

  let tail = upper.slice(hyphenIndex + 1);
  if (!tail) return null;

  // 例: GDM2020N-015PF -> 015PF から PF を取り出す
  const numericPrefixMatch = tail.match(/^\d{2,3}([A-Z]{1,3})$/);
  if (numericPrefixMatch) {
    tail = numericPrefixMatch[1];
  } else {
    // 末尾の英字だけをブレーカー候補として扱う
    const letters = tail.replace(/[^A-Z]/g, "");
    if (letters.length > 0 && letters.length <= 3) {
      tail = letters;
    }
  }

  if (!tail) return null;
  return tail;
}

export function parseShapeFromCode(code: string): { key: string; label: string } {
  const upper = code.toUpperCase().trim();

  if (upper.startsWith("DCMT") || upper.startsWith("DCGT")) {
    return { key: "diamond55", label: "55°菱形(D)" };
  }

  if (upper.startsWith("CNMG")) {
    return { key: "diamond80", label: "80°菱形(C)" };
  }

  if (
    upper.startsWith("TNMG") ||
    upper.startsWith("TNGG") ||
    upper.startsWith("TPGH") ||
    upper.startsWith("TPMH")
  ) {
    return { key: "triangle", label: "三角(T)" };
  }

  if (upper.startsWith("VNBR")) {
    return { key: "diamond35", label: "35°菱形(V)" };
  }

  if (upper.startsWith("GDM") || upper.startsWith("JXBR")) {
    return { key: "grooving", label: "溝入れ/突切" };
  }

  return { key: "other", label: "その他" };
}
