import { z } from "zod";

/**
 * Central ticket category configuration — the single source of truth.
 *
 * The classifier (Task 3), the UI and the future database check constraint
 * (Task 4) must all derive from this file. Never hardcode category ids
 * anywhere else. To add a category in a future sprint, append one entry
 * to `categoryEntries` — the ids, the zod schemas and the type all follow.
 */

export interface CategoryConfig {
  /** Unique identifier stored in the database `category` column. */
  id: string;
  /** Human-readable name shown in the UI. */
  name: string;
  /** One-line description of what belongs in this category. */
  description: string;
  /** Realistic example requests, also used as few-shot examples by the classifier. */
  examples: string[];
}

const categoryEntries = [
  {
    id: "HR",
    name: "Human Resources",
    description:
      "Leave requests, payslips, employee benefits, employment letters and questions about staff policies.",
    examples: [
      "I would like to book three days of annual leave next month.",
      "Please can you send me a copy of my latest payslip?",
      "How many parental leave days am I entitled to?",
      "I need an employment letter confirming my salary for a home loan application.",
      "Where do I find the company's remote work policy?",
    ],
  },
  {
    id: "IT",
    name: "Information Technology",
    description:
      "Password resets, account access problems, software errors, hardware faults and network connectivity issues.",
    examples: [
      "I forgot my password and cannot log in to the portal.",
      "Outlook keeps crashing every time I open an attachment.",
      "My laptop will not connect to the office Wi-Fi.",
      "The printer in my office shows an error and will not print.",
      "I get an 'access denied' message when I open the shared drive.",
    ],
  },
  {
    id: "FINANCE",
    name: "Finance",
    description:
      "Reimbursement requests, invoice queries, payment issues, expense claims and payroll payment discrepancies.",
    examples: [
      "I submitted an expense claim two weeks ago and have not been reimbursed.",
      "The amount paid into my account does not match my salary slip.",
      "Please reissue invoice INV-2041, the VAT amount on it is wrong.",
      "How do I claim back the travel costs for last month's client visit?",
      "A supplier says their invoice has not been paid yet.",
    ],
  },
  {
    id: "OPERATIONS",
    name: "Operations",
    description:
      "Office supplies, building maintenance, facilities issues, equipment requests and general operational problems.",
    examples: [
      "The air conditioning in meeting room 2 is not working.",
      "We have run out of printer paper and coffee supplies.",
      "One of the lights in the parking area is flickering and needs replacing.",
      "Please arrange a new desk chair for workstation 14.",
      "The kitchen tap has been dripping for a week.",
    ],
  },
] as const satisfies readonly CategoryConfig[];

export const PRIMARY_CATEGORIES = categoryEntries;

export type CategoryId = (typeof categoryEntries)[number]["id"];

/** The four primary category ids: "HR" | "IT" | "FINANCE" | "OPERATIONS". */
export const CATEGORY_IDS = categoryEntries.map((c) => c.id) as [
  CategoryId,
  ...CategoryId[],
];

/**
 * Fallback marker for requests the classifier cannot reliably place
 * (confidence below MIN_CONFIDENCE, or the model returns something unknown).
 * It is NOT a primary category: such tickets are flagged for manual review.
 */
export const UNCATEGORIZED_ID = "UNCLASSIFIED";

/** Every value that may ever be stored in the database `category` column. */
export type StorableCategoryId = CategoryId | typeof UNCATEGORIZED_ID;
export const STORABLE_CATEGORY_IDS = [
  ...CATEGORY_IDS,
  UNCATEGORIZED_ID,
] as [StorableCategoryId, ...StorableCategoryId[]];

/** Schema for a reliable prediction: only the four primary ids, exact case. */
export const categorySchema = z.enum(CATEGORY_IDS);

/** Schema for a stored category: primary ids plus the manual-review marker. */
export const storedCategorySchema = z.enum(STORABLE_CATEGORY_IDS);

/** Confidence cutoff agreed in the design doc: below this -> needs_review. */
export const MIN_CONFIDENCE = 0.6;

/** Request text limits agreed in the design doc (starting values). */
export const REQUEST_MIN_LENGTH = 10;
export const REQUEST_MAX_LENGTH = 2000;

export function getCategory(id: string): CategoryConfig | undefined {
  return PRIMARY_CATEGORIES.find((c) => c.id === id);
}

export function isCategoryId(id: unknown): id is CategoryId {
  return categorySchema.safeParse(id).success;
}
