import { describe, it, expect } from "vitest";
import {
  chipImageUrlItemsToMap,
  type ChipImageUrlItem,
} from "./cloudChipImageUrlClient";

describe("chipImageUrlItemsToMap", () => {
  it("preserves null for image_url null (取得済み・画像なし)", () => {
    const items: ChipImageUrlItem[] = [
      { chip_id: "c1", image_url: null, updated_at: "2024-01-01T00:00:00Z" },
    ];
    expect(chipImageUrlItemsToMap(items)).toEqual({ c1: null });
  });

  it("maps non-empty image_url to trimmed string", () => {
    const items: ChipImageUrlItem[] = [
      {
        chip_id: "c1",
        image_url: "  https://example.com/img.jpg  ",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];
    expect(chipImageUrlItemsToMap(items)).toEqual({
      c1: "https://example.com/img.jpg",
    });
  });

  it("maps empty string image_url to null", () => {
    const items: ChipImageUrlItem[] = [
      { chip_id: "c1", image_url: "", updated_at: "2024-01-01T00:00:00Z" },
    ];
    expect(chipImageUrlItemsToMap(items)).toEqual({ c1: null });
  });

  it("handles multiple items with mixed null and string", () => {
    const items: ChipImageUrlItem[] = [
      { chip_id: "c1", image_url: "https://a/1.jpg", updated_at: "2024-01-01T00:00:00Z" },
      { chip_id: "c2", image_url: null, updated_at: "2024-01-01T00:00:00Z" },
      { chip_id: "c3", image_url: "https://b/2.png", updated_at: "2024-01-01T00:00:00Z" },
    ];
    expect(chipImageUrlItemsToMap(items)).toEqual({
      c1: "https://a/1.jpg",
      c2: null,
      c3: "https://b/2.png",
    });
  });

  it("returns empty object for empty items", () => {
    expect(chipImageUrlItemsToMap([])).toEqual({});
  });
});
