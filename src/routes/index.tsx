import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MIN_CONFIDENCE,
  PRIMARY_CATEGORIES,
  REQUEST_MAX_LENGTH,
  REQUEST_MIN_LENGTH,
  UNCATEGORIZED_ID,
  getCategory,
} from "@/lib/categories";
import { classificationRequestSchema } from "@/lib/classification";
import type { ClassificationResult } from "@/lib/classification";
import { classifyTicket } from "@/lib/tickets.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Ticket Engine | Classify a support request" },
      {
        name: "description",
        content:
          "Classify employee support requests into HR, IT, Finance or Operations with the Smart Ticket Classification Engine, and browse the category configuration.",
      },
      { property: "og:title", content: "Smart Ticket Engine | Classify a support request" },
      {
        property: "og:description",
        content:
          "AI classification of support requests into HR, IT, Finance and Operations, with a manual-review fallback.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const exampleRequest = "I submitted an expense claim two weeks ago and have not been reimbursed.";

function Index() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);

    // Client-side validation first: same rules the server re-checks.
    const parsed = classificationRequestSchema.safeParse({ text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your request and try again.");
      return;
    }

    setPending(true);
    try {
      const response = await classifyTicket({ data: { text: parsed.data.text } });
      setResult(response);
    } catch {
      setError("Something went wrong while classifying your request. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const length = text.trim().length;
  const tooLong = length > REQUEST_MAX_LENGTH;
  const tooShort = length > 0 && length < REQUEST_MIN_LENGTH;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Smart Ticket Classification Engine
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Type a support request below to see which of the four categories it belongs to.
            Requests the engine cannot place reliably are marked{" "}
            <code className="text-foreground">{UNCATEGORIZED_ID}</code> and flagged for
            manual review rather than forced into a category.
          </p>
        </header>

        <Card className="mb-10">
          <CardHeader>
            <CardTitle className="text-lg">Try the classifier</CardTitle>
            <CardDescription>
              {REQUEST_MIN_LENGTH}–{REQUEST_MAX_LENGTH} characters. The request is analysed
              on the server; nothing is stored yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={`e.g. "${exampleRequest}"`}
                rows={3}
                maxLength={REQUEST_MAX_LENGTH + 1}
                aria-label="Support request"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={pending || tooShort || tooLong}>
                  {pending ? "Classifying…" : "Classify request"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {length}/{REQUEST_MAX_LENGTH} characters
                </span>
              </div>
            </form>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Cannot classify this request</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && <ResultCard result={result} />}
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
            Category configuration
          </h2>
          <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
            The single configuration in{" "}
            <code className="text-foreground">src/lib/categories.ts</code> drives the
            classifier, the validation and the future database check constraint.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {PRIMARY_CATEGORIES.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{category.id}</Badge>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </div>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Example requests
                  </p>
                  <ul className="space-y-1.5">
                    {category.examples.map((example) => (
                      <li
                        key={example}
                        className="text-sm text-foreground/90 before:mr-2 before:text-muted-foreground before:content-['•']"
                      >
                        {example}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: ClassificationResult }) {
  const category = getCategory(result.category);
  const isUncategorized = result.category === UNCATEGORIZED_ID;

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Predicted category:</span>
        {category ? (
          <Badge>{category.name}</Badge>
        ) : (
          <Badge variant="outline">{UNCATEGORIZED_ID}</Badge>
        )}
        <span className="text-sm text-muted-foreground">
          Confidence: {Math.round(result.confidence * 100)}%
        </span>
        {result.needsReview && <Badge variant="secondary">Needs manual review</Badge>}
      </div>
      <p className="mt-2 text-sm text-foreground/90">{result.explanation}</p>
      {isUncategorized && (
        <p className="mt-1 text-xs text-muted-foreground">
          This request does not clearly belong to one category. A person will review it
          and assign the right one.
        </p>
      )}
      {result.confidence < MIN_CONFIDENCE && !isUncategorized && (
        <p className="mt-1 text-xs text-muted-foreground">
          Low confidence best guess: a person will confirm the category.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Classified by: {result.method === "ai" ? "AI classifier" : "keyword fallback"}
      </p>
    </div>
  );
}
