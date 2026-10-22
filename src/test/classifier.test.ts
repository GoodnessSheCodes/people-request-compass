import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  REQUEST_MAX_LENGTH,
  REQUEST_MIN_LENGTH,
  UNCATEGORIZED_ID,
  storedCategorySchema,
} from "@/lib/categories";
import {
  classificationRequestSchema,
  classificationResultSchema,
} from "@/lib/classification";
import { classifyWithKeywords } from "@/lib/keyword-classifier";
import { classifyRequest } from "@/lib/classifier.server";

describe("Request validation", () => {
  it("rejects empty and whitespace-only requests", () => {
    expect(classificationRequestSchema.safeParse({ text: "" }).success).toBe(false);
    expect(classificationRequestSchema.safeParse({ text: "   " }).success).toBe(false);
  });

  it("enforces the 10-2000 character limits from the design doc", () => {
    expect(classificationRequestSchema.safeParse({ text: "short" }).success).toBe(false);
    expect(
      classificationRequestSchema.safeParse({ text: "a".repeat(REQUEST_MIN_LENGTH) }).success,
    ).toBe(true);
    expect(
      classificationRequestSchema.safeParse({ text: "a".repeat(REQUEST_MAX_LENGTH) }).success,
    ).toBe(true);
    expect(
      classificationRequestSchema.safeParse({ text: "a".repeat(REQUEST_MAX_LENGTH + 1) })
        .success,
    ).toBe(false);
  });
});

describe("Keyword baseline classifier", () => {
  it("classifies realistic HR requests", () => {
    for (const text of [
      "I would like to book three days of annual leave next month.",
      "Please can you send me a copy of my latest payslip?",
      "Where do I find the company's remote work policy?",
    ]) {
      const result = classifyWithKeywords(text);
      expect(result.category).toBe("HR");
      expect(result.needsReview).toBe(false);
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    }
  });

  it("classifies realistic IT requests", () => {
    for (const text of [
      "I forgot my password and cannot log in to the portal.",
      "My laptop will not connect to the office Wi-Fi.",
      "The printer in my office shows an error and will not print.",
    ]) {
      const result = classifyWithKeywords(text);
      expect(result.category).toBe("IT");
      expect(result.needsReview).toBe(false);
    }
  });

  it("classifies realistic Finance requests", () => {
    for (const text of [
      "I submitted an expense claim two weeks ago and have not been reimbursed.",
      "Please reissue invoice INV-2041, the VAT amount on it is wrong.",
      "A supplier says their invoice has not been paid yet.",
    ]) {
      const result = classifyWithKeywords(text);
      expect(result.category).toBe("FINANCE");
      expect(result.needsReview).toBe(false);
    }
  });

  it("classifies realistic Operations requests", () => {
    for (const text of [
      "The air conditioning in meeting room 2 is not working.",
      "We have run out of printer paper and coffee supplies.",
      "Please arrange a new desk chair for workstation 14.",
    ]) {
      const result = classifyWithKeywords(text);
      expect(result.category).toBe("OPERATIONS");
      expect(result.needsReview).toBe(false);
    }
  });

  it("flags a request that could belong to two categories for manual review", () => {
    const result = classifyWithKeywords(
      "My payslip amount is wrong and my laptop will not start.",
    );
    expect(result.needsReview).toBe(true);
    expect(result.confidence).toBeLessThan(0.6);
    expect(["UNCLASSIFIED", "HR", "IT", "FINANCE", "OPERATIONS"]).toContain(result.category);
  });

  it("marks unrelated requests as needing manual review, not a forced category", () => {
    for (const text of [
      "Can you recommend a good restaurant near the office for a team lunch?",
      "What time does the shuttle to the airport leave tomorrow?",
    ]) {
      const result = classifyWithKeywords(text);
      expect(result.category).toBe(UNCATEGORIZED_ID);
      expect(result.needsReview).toBe(true);
    }
  });

  it("marks requests with too little information as needing manual review", () => {
    const result = classifyWithKeywords("I need help with something, please.");
    expect(result.category).toBe(UNCATEGORIZED_ID);
    expect(result.needsReview).toBe(true);
  });

  it("always returns a storable category, a bounded confidence and an explanation", () => {
    const samples = [
      "I would like to book leave.",
      "Help.",
      "The air conditioning in meeting room 2 is not working.",
      "My salary is wrong and my laptop will not start.",
    ];
    for (const text of samples) {
      const result = classifyWithKeywords(text);
      expect(storedCategorySchema.safeParse(result.category).success).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.explanation.length).toBeGreaterThan(0);
      expect(classificationResultSchema.safeParse(result).success).toBe(true);
    }
  });
});

describe("Classification engine error handling", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("falls back to the keyword classifier when the AI key is missing", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await classifyRequest(
      "I would like to book three days of annual leave next month.",
    );

    expect(result.method).toBe("keyword_fallback");
    expect(result.category).toBe("HR");
    expect(consoleError).toHaveBeenCalled();
  });
});
