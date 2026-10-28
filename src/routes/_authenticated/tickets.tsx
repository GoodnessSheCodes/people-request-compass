import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  REQUEST_MAX_LENGTH,
  REQUEST_MIN_LENGTH,
  UNCATEGORIZED_ID,
  getCategory,
} from "@/lib/categories";
import { classificationRequestSchema } from "@/lib/classification";
import type { Ticket } from "@/lib/tickets";
import { listTickets, submitTicket } from "@/lib/tickets.functions";

const ticketsQuery = queryOptions({
  queryKey: ["tickets"],
  queryFn: () => listTickets(),
});

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({
    meta: [
      { title: "My tickets | Smart Ticket Engine" },
      { name: "description", content: "Submit a support request, see its category and browse your saved tickets." },
      { property: "og:title", content: "My tickets | Smart Ticket Engine" },
      { property: "og:description", content: "Submit and track classified support tickets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(ticketsQuery),
  component: TicketsPage,
  errorComponent: TicketsError,
  notFoundComponent: () => <p className="p-6">No tickets found.</p>,
});

function TicketsError({ error }: { error: unknown }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-xl p-10">
      <Alert variant="destructive">
        <AlertTitle>Tickets could not be loaded</AlertTitle>
        <AlertDescription>{error instanceof Error ? error.message : "Please try again."}</AlertDescription>
      </Alert>
      <Button className="mt-4" onClick={() => router.invalidate()}>Try again</Button>
    </div>
  );
}

function TicketsPage() {
  const { data: tickets } = useSuspenseQuery(ticketsQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const submit = useServerFn(submitTicket);
  const [text, setText] = useState("");
  const [latest, setLatest] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // One id per distinct request text: retries of the same text reuse it, so
  // the server returns the already-saved ticket instead of a duplicate.
  const attempt = useRef<{ text: string; id: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = classificationRequestSchema.safeParse({ text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your request.");
      return;
    }
    if (attempt.current?.text !== parsed.data.text) {
      attempt.current = { text: parsed.data.text, id: crypto.randomUUID() };
    }
    setPending(true);
    try {
      const { ticket } = await submit({
        data: { text: parsed.data.text, clientRequestId: attempt.current.id },
      });
      setLatest(ticket);
      setText("");
      attempt.current = null;
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/" });
  }

  const length = text.trim().length;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">My tickets</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Requests are classified and saved to your account. Only you can see them.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild><Link to="/">Categories</Link></Button>
            <Button variant="outline" onClick={signOut}>Sign out</Button>
          </div>
        </header>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">New support request</CardTitle>
            <CardDescription>{REQUEST_MIN_LENGTH}–{REQUEST_MAX_LENGTH} characters.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                maxLength={REQUEST_MAX_LENGTH + 1}
                aria-label="Support request"
                placeholder="Describe your issue…"
              />
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={pending}>
                  {pending ? "Classifying and saving…" : "Submit request"}
                </Button>
                <span className="text-xs text-muted-foreground">{length}/{REQUEST_MAX_LENGTH}</span>
              </div>
            </form>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Request not saved</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {latest && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-foreground">Saved ticket</p>
                <TicketCard ticket={latest} />
              </div>
            )}
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-3 text-xl font-semibold tracking-tight text-foreground">
            Saved tickets ({tickets.length})
          </h2>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet. Submit your first request above.</p>
          ) : (
            <ul className="space-y-3">
              {tickets.map((t) => (
                <li key={t.id}><TicketCard ticket={t} /></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const category = getCategory(ticket.category);
  return (
    <div className="rounded-lg border border-border bg-card p-4" data-testid="ticket">
      <div className="flex flex-wrap items-center gap-2">
        {category ? <Badge>{category.name}</Badge> : <Badge variant="outline">{UNCATEGORIZED_ID}</Badge>}
        <Badge variant={ticket.status === "classified" ? "secondary" : "outline"}>
          {ticket.status === "classified" ? "Classified" : "Needs review"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Confidence {Math.round(ticket.confidence * 100)}% ·{" "}
          {ticket.method === "ai" ? "AI classifier" : "keyword fallback"} ·{" "}
          {new Date(ticket.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground">{ticket.requestText}</p>
      <p className="mt-1 text-xs text-muted-foreground">{ticket.explanation}</p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">Ticket {ticket.id}</p>
    </div>
  );
}
