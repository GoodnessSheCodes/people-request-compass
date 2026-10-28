import { Link, createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRIMARY_CATEGORIES, UNCATEGORIZED_ID } from "@/lib/categories";

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

function Index() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Smart Ticket Classification Engine
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Submit a support request and it is classified into one of the four categories
            below, then saved to your account. Requests that cannot be placed reliably are
            marked <code className="text-foreground">{UNCATEGORIZED_ID}</code> and flagged
            for manual review.
          </p>
          <Button asChild className="mt-4">
            <Link to="/tickets">Open my tickets</Link>
          </Button>
        </header>

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
