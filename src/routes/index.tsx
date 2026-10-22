import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PRIMARY_CATEGORIES,
  UNCATEGORIZED_ID,
} from "@/lib/categories";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ticket Categories | Smart Ticket Engine" },
      {
        name: "description",
        content:
          "The four support ticket categories of the Smart Ticket Classification Engine: HR, IT, Finance and Operations, with example requests and a manual-review fallback.",
      },
      { property: "og:title", content: "Ticket Categories | Smart Ticket Engine" },
      {
        property: "og:description",
        content:
          "HR, IT, Finance and Operations ticket categories with examples and a manual-review fallback.",
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
            Ticket categories
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            The single configuration in <code className="text-foreground">src/lib/categories.ts</code>{" "}
            drives classification, validation and storage. Requests the engine cannot
            place reliably are marked{" "}
            <Badge variant="outline">{UNCATEGORIZED_ID}</Badge> and flagged for manual
            review rather than forced into a category.
          </p>
        </header>

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
      </div>
    </div>
  );
}
