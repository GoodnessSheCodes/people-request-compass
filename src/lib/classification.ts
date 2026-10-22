import { z } from "zod";

import {
  REQUEST_MAX_LENGTH,
  REQUEST_MIN_LENGTH,
  storedCategorySchema,
} from "./categories";

/**
 * Shared classification contracts. Safe to import from both the browser
 * and the server: no secrets and no AI SDK code live here.
 */

/** Input rules agreed in the design doc: trimmed text of 10-2000 characters. */
export const classificationRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(REQUEST_MIN_LENGTH, {
      message: `Please describe your issue in at least ${REQUEST_MIN_LENGTH} characters.`,
    })
    .max(REQUEST_MAX_LENGTH, {
      message: `Please keep your request under ${REQUEST_MAX_LENGTH} characters.`,
    }),
});

export type ClassificationMethod = "ai" | "keyword_fallback";

/** What the classifier returns for one request. */
export interface ClassificationResult {
  requestText: string;
  /** A primary category id, or UNCLASSIFIED when nothing reliable was found. */
  category: string;
  /** 0-1; how sure the chosen method is about the category. */
  confidence: number;
  /** Brief, user-facing explanation of the prediction. */
  explanation: string;
  /** True when a person should confirm the category before action is taken. */
  needsReview: boolean;
  /** Which classifier produced the result. */
  method: ClassificationMethod;
}

/** Validates a stored classification result (category must be a known value). */
export const classificationResultSchema = z.object({
  requestText: z.string(),
  category: storedCategorySchema,
  confidence: z.number().min(0).max(1),
  explanation: z.string().min(1),
  needsReview: z.boolean(),
  method: z.enum(["ai", "keyword_fallback"]),
});
