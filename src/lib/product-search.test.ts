import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSearchText } from "@/lib/product-sync";

describe("buildSearchText helper", () => {
  it("concatenates product fields into a normalized lowercase search text", () => {
    const result = buildSearchText({
      name: "فستان سهرة أسود",
      description: "فستان أنيق مناسب للحفلات والمناسبات",
      tags: ["فساتين", "أسود", "ملابس نسائية"],
      category: "ملابس",
    });

    expect(result).toContain("فستان سهرة أسود");
    expect(result).toContain("فساتين أسود ملابس نسائية");
    expect(result).toContain("ملابس");
    expect(result).toEqual(result.toLowerCase());
  });

  it("handles missing or null optional fields gracefully", () => {
    const result = buildSearchText({
      name: "قميص قطن",
      description: null,
      tags: null,
      category: undefined,
    });

    expect(result).toBe("قميص قطن");
  });
});
