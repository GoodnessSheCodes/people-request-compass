import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

import {
  MIN_CONFIDENCE,
  PRIMARY_CATEGORIES,
  UNCATEGORIZED_ID,
  storedCategorySchema,
} from "./categories";
import type { ClassificationResult } from "./classification";
import { classifyWithKeywords } from "./keyword-classifier";

/**
 * Classification engine (server-only).
 *
 * Primary method: Lovable AI (an AI language model) asked to pick one of the
 * four configured categories, with a confidence score and a short explanation.
 * The category examples in src/lib/categories.ts are sent as few-shot
 * examples, so adding a category there updates the AI too.
 *
 * Fallback: if the AI call fails or returns an unusable answer, the keyword
 * baseline in keyword-classifier.ts takes over and the result is marked
 * `keyword_fallback`. Nothing is ever silently mislabelled as AI output.
 *
 * Ambiguity: a category below MIN_CONFIDENCE, or UNCLASSIFIED, sets
 * needsReview = true instead of forcing an unreliable prediction.
 */

const LOVABLE_AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

// Default gateway model for new chat/text calls (resolved from the
// authenticated model listing at build time of this project).
const CLASSIFICATION_MODEL = "openai/gpt-6-astra";

const classificationOutputSchema = z
  .object({
    category: storedCategorySchema,
    confidence: z.number().min(0).max(1),
    explanation: z.string().min(1),
  })
  .strict();

const categoryExamples = PRIMARY_CATEGORIES.map(
  (category) =>
    `- ${category.id} (${category.name}): ${category.description} Examples: ${category.examples
      .slice(0, 3)
      .map((example) => `"${example}"`)
      .join(", ")}`,
).join("\n");

const systemPrompt = `You classify employee support requests into one of four categories, or mark them for manual review.

Categories:
${categoryExamples}

Rules:
- Choose the single best category id: HR, IT, FINANCE or OPERATIONS.
- Use "${UNCATEGORIZED_ID}" when the request fits more than one category equally, is out of scope for all four categories, or does not contain enough information to decide. Never force a guess you are not confident in.
- confidence is a number from 0 to 1: how sure you are about the category. Use 0.5 or lower when uncertain.
- explanation is one short sentence a non-technical employee can read, naming the words in the request that drove the decision.
- Respond only with the required JSON object.`;

async function classifyWithAi(
  text: string,
  signal?: AbortSignal,
): Promise<ClassificationResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  // Provider and run-ID wrapper are created inside each request.
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: LOVABLE_AI_GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses(CLASSIFICATION_MODEL),
    instructions: systemPrompt,
    messages: [{ role: "user", content: text }],
    abortSignal: signal,
    maxRetries: 0,
    output: Output.object({ schema: classificationOutputSchema }),
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const parsed = await result.output;

  const confidence = Math.min(1, Math.max(0, parsed.confidence));
  return {
    requestText: text,
    category: parsed.category,
    confidence,
    explanation: parsed.explanation,
    needsReview: parsed.category === UNCATEGORIZED_ID || confidence < MIN_CONFIDENCE,
    method: "ai",
  };
}

export async function classifyRequest(
  text: string,
  signal?: AbortSignal,
): Promise<ClassificationResult> {
  try {
    return await classifyWithAi(text, signal);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Log the reason server-side only; never show raw provider errors to users.
    console.error("[classifier] AI classification failed, using keyword fallback:", message);
    return classifyWithKeywords(text);
  }
}
