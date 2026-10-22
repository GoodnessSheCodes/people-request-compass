import { describe, expect, it } from "vitest";

import {
  CATEGORY_IDS,
  MIN_CONFIDENCE,
  PRIMARY_CATEGORIES,
  REQUEST_MAX_LENGTH,
  REQUEST_MIN_LENGTH,
  UNCATEGORIZED_ID,
  categorySchema,
  getCategory,
  isCategoryId,
  storedCategorySchema,
} from "@/lib/categories";

describe("Category configuration", () => {
  it("contains exactly the four primary categories required by the brief", () => {
    expect(CATEGORY_IDS).toEqual(["HR", "IT", "FINANCE", "OPERATIONS"]);
  });

  it("gives every category a unique id, a name, a description and examples", () => {
    expect(new Set(CATEGORY_IDS).size).toBe(CATEGORY_IDS.length);
    for (const category of PRIMARY_CATEGORIES) {
      expect(category.name.length).toBeGreaterThan(0);
      expect(category.description.length).toBeGreaterThan(0);
      expect(category.examples.length).toBeGreaterThanOrEqual(3);
      for (const example of category.examples) {
        expect(example.length).toBeGreaterThan(0);
      }
    }
  });

  it("represents each of HR, IT, Finance and Operations with a matching description", () => {
    const descriptions = Object.fromEntries(
      PRIMARY_CATEGORIES.map((c) => [c.id, c.description]),
    );
    expect(descriptions["HR"]).toMatch(/leave|payslip|benefit|polic/i);
    expect(descriptions["IT"]).toMatch(/password|hardware|network|software/i);
    expect(descriptions["FINANCE"]).toMatch(/reimburse|invoice|payment|expense/i);
    expect(descriptions["OPERATIONS"]).toMatch(/supplies|maintenance|facilit|equipment/i);
  });
});

describe("Category validation", () => {
  it("accepts every primary category id", () => {
    for (const id of CATEGORY_IDS) {
      expect(categorySchema.safeParse(id).success).toBe(true);
      expect(isCategoryId(id)).toBe(true);
    }
  });

  it("rejects unknown, empty and wrong-case ids so invalid categories cannot be saved", () => {
    expect(categorySchema.safeParse("MAGIC").success).toBe(false);
    expect(categorySchema.safeParse("").success).toBe(false);
    expect(categorySchema.safeParse("hr").success).toBe(false);
    expect(categorySchema.safeParse(null).success).toBe(false);
    expect(isCategoryId("operations")).toBe(false);
  });

  it("allows UNCLASSIFIED only as the manual-review fallback, not as a primary category", () => {
    expect(storedCategorySchema.safeParse(UNCATEGORIZED_ID).success).toBe(true);
    expect(categorySchema.safeParse(UNCATEGORIZED_ID).success).toBe(false);
    expect(CATEGORY_IDS).not.toContain(UNCATEGORIZED_ID);
  });

  it("keeps the request length limits from the design doc", () => {
    expect(REQUEST_MIN_LENGTH).toBe(10);
    expect(REQUEST_MAX_LENGTH).toBe(2000);
  });

  it("keeps the 0.6 confidence cutoff from the design doc", () => {
    expect(MIN_CONFIDENCE).toBe(0.6);
  });
});

describe("Category lookup", () => {
  it("returns the right configuration for each id", () => {
    expect(getCategory("HR")?.name).toBe("Human Resources");
    expect(getCategory("IT")?.name).toBe("Information Technology");
    expect(getCategory("FINANCE")?.name).toBe("Finance");
    expect(getCategory("OPERATIONS")?.name).toBe("Operations");
    expect(getCategory("NOPE")).toBeUndefined();
  });
});
