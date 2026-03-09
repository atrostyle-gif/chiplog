import { describe, it, expect } from "vitest";
import { getBlobKeyFromImageUrl } from "./cloudImageClient";

describe("getBlobKeyFromImageUrl", () => {
  it("returns key when URL has serve-chip-image and valid key", () => {
    const url =
      "https://example.com/.netlify/functions/serve-chip-image?key=chips/abc123/1700000000000.jpg";
    expect(getBlobKeyFromImageUrl(url)).toBe("chips/abc123/1700000000000.jpg");
  });

  it("returns key when path contains serve-chip-image and key matches pattern", () => {
    const url =
      "http://localhost:8888/.netlify/functions/serve-chip-image?key=chips/CHIP-01/123.png";
    expect(getBlobKeyFromImageUrl(url)).toBe("chips/CHIP-01/123.png");
  });

  it("returns null when path does not contain serve-chip-image", () => {
    expect(
      getBlobKeyFromImageUrl(
        "https://example.com/.netlify/functions/other?key=chips/a/b.jpg"
      )
    ).toBeNull();
  });

  it("returns null when key param is missing", () => {
    expect(
      getBlobKeyFromImageUrl(
        "https://example.com/.netlify/functions/serve-chip-image"
      )
    ).toBeNull();
  });

  it("returns null when key does not match chips/<id>/<suffix> pattern", () => {
    expect(
      getBlobKeyFromImageUrl(
        "https://example.com/.netlify/functions/serve-chip-image?key=../other/b.jpg"
      )
    ).toBeNull();
    expect(
      getBlobKeyFromImageUrl(
        "https://example.com/.netlify/functions/serve-chip-image?key=chips/only"
      )
    ).toBeNull();
  });

  it("returns null for malformed URL", () => {
    expect(getBlobKeyFromImageUrl("not-a-url")).toBeNull();
  });
});
