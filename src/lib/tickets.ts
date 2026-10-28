import { z } from "zod";

import { UNCATEGORIZED_ID, storedCategorySchema } from "./categories";
import type { ClassificationResult } from "./classification";
import { classificationRequestSchema } from "./classification";

/**
 * Shared ticket contracts (browser + server safe). The database row shape
 * lives in the `tickets` table; this file maps classifier output to it and
 * back to a plain DTO the UI renders.
 */

export const TICKET_STATUSES = ["classified", "needs_review"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Submit payload: request text + a client-generated id that makes retries safe. */
export const submitTicketSchema = classificationRequestSchema.extend({
  clientRequestId: z.string().uuid(),
});
export type SubmitTicketInput = z.infer<typeof submitTicketSchema>;

export interface Ticket {
  id: string;
  requestText: string;
  category: string;
  confidence: number;
  explanation: string;
  status: TicketStatus;
  method: "ai" | "keyword_fallback";
  createdAt: string;
}

export function statusFor(result: Pick<ClassificationResult, "needsReview" | "category">): TicketStatus {
  return result.needsReview || result.category === UNCATEGORIZED_ID ? "needs_review" : "classified";
}

/** Validated insert row. Throws if the classifier produced an invalid category. */
export function toTicketInsert(
  result: ClassificationResult,
  userId: string,
  clientRequestId: string,
) {
  const category = storedCategorySchema.parse(result.category);
  return {
    user_id: userId,
    client_request_id: clientRequestId,
    request_text: result.requestText,
    category,
    confidence: Math.round(Math.min(1, Math.max(0, result.confidence)) * 1000) / 1000,
    explanation: result.explanation,
    status: statusFor(result),
    method: result.method,
  };
}

export interface TicketRow {
  id: string;
  request_text: string;
  category: string;
  confidence: number | string;
  explanation: string;
  status: string;
  method: string;
  created_at: string;
}

export function toTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    requestText: row.request_text,
    category: row.category,
    confidence: Number(row.confidence),
    explanation: row.explanation,
    status: row.status === "classified" ? "classified" : "needs_review",
    method: row.method === "ai" ? "ai" : "keyword_fallback",
    createdAt: row.created_at,
  };
}

export const TICKET_COLUMNS =
  "id, request_text, category, confidence, explanation, status, method, created_at";
