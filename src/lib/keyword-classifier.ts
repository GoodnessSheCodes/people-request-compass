import {
  MIN_CONFIDENCE,
  PRIMARY_CATEGORIES,
  UNCATEGORIZED_ID,
  type CategoryId,
} from "./categories";
import type { ClassificationResult } from "./classification";

/**
 * Keyword baseline classifier — the documented FALLBACK used when the AI
 * service is unavailable or returns an unusable answer.
 *
 * How it works: it counts category keyword hits in the text and computes
 * confidence as `top / (top + runnerUp + 0.5)`, so a single strong match is
 * confident, a tie or a near-tie is not.
 *
 * Known limitations (it is NOT machine learning and nothing is trained):
 * - It only recognises the exact words listed below; synonyms and typos fail.
 * - Requests mixing two categories can tie and are marked UNCLASSIFIED.
 * - Sarcasm, context and negation ("no issues with my payslip") are ignored.
 * A more capable model (the AI classifier in classifier.server.ts) replaces
 * this automatically whenever it is available.
 */

/** One keyword list per configured category; the type forces the lists to
 * stay in sync with src/lib/categories.ts when categories are added. */
const KEYWORDS: Record<CategoryId, string[]> = {
  HR: [
    "annual leave",
    "sick leave",
    "days of leave",
    "leave request",
    "book leave",
    "payslip",
    "salary slip",
    "benefit",
    "employment letter",
    "staff policy",
    "company policy",
    "remote work policy",
    "maternity",
    "parental",
    "entitled",
    "human resources",
  ],
  IT: [
    "password",
    "log in",
    "login",
    "account access",
    "access denied",
    "wi-fi",
    "wifi",
    "network",
    "software",
    "hardware",
    "laptop",
    "printer",
    "crashing",
    "not connect",
    "vpn",
    "email",
    "outlook",
    "it support",
  ],
  FINANCE: [
    "reimburse",
    "expense claim",
    "expense",
    "invoice",
    "payment",
    "paid",
    "payroll",
    "refund",
    "budget",
    "finance",
    "tax",
    "salary discrepancy",
  ],
  OPERATIONS: [
    "office supplies",
    "supplies",
    "maintenance",
    "air conditioning",
    "facilities",
    "desk chair",
    "chair",
    "kitchen",
    "lights",
    "parking",
    "cleaning",
    "furniture",
    "building",
    "workstation",
    "meeting room",
    "tap",
    "printer paper",
    "coffee",
  ],
};

function countKeyword(lowerText: string, keyword: string): number {
  // Word-boundary match for single words, plain search for phrases.
  const pattern = keyword.includes(" ")
    ? keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`;
  return (lowerText.match(new RegExp(pattern, "g")) ?? []).length;
}

export function classifyWithKeywords(text: string): ClassificationResult {
  const lowerText = text.toLowerCase();

  const scored = PRIMARY_CATEGORIES.map((category) => {
    let score = 0;
    const matched: string[] = [];
    for (const keyword of KEYWORDS[category.id]) {
      const count = countKeyword(lowerText, keyword);
      if (count > 0) {
        score += count;
        matched.push(keyword);
      }
    }
    return { id: category.id, name: category.name, score, matched };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const top = scored[0];
  const runnerUp = scored[1];

  if (!top || !runnerUp || top.score === 0) {
    return {
      requestText: text,
      category: UNCATEGORIZED_ID,
      confidence: 0,
      explanation:
        "No keywords matched any category, so the request is flagged for manual review.",
      needsReview: true,
      method: "keyword_fallback",
    };
  }

  if (runnerUp.score === top.score) {
    return {
      requestText: text,
      category: UNCATEGORIZED_ID,
      confidence: Number((top.score / (top.score + runnerUp.score + 0.5)).toFixed(2)),
      explanation: `The request matches both ${top.name} ("${top.matched.slice(0, 3).join('", "')}") and ${runnerUp.name} ("${runnerUp.matched.slice(0, 3).join('", "')}") equally, so it is flagged for manual review.`,
      needsReview: true,
      method: "keyword_fallback",
    };
  }

  const confidence = Number(
    (top.score / (top.score + runnerUp.score + 0.5)).toFixed(2),
  );
  const needsReview = confidence < MIN_CONFIDENCE;
  return {
    requestText: text,
    category: top.id,
    confidence,
    explanation: `Matched ${top.matched.length} ${top.name} keyword${top.matched.length === 1 ? "" : "s"} (${top.matched.slice(0, 3).join(", ")}).`,
    needsReview,
    method: "keyword_fallback",
  };
}
