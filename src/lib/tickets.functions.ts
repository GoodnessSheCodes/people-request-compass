import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { classifyRequest } from "./classifier.server";
import { TICKET_COLUMNS, submitTicketSchema, toTicket, toTicketInsert } from "./tickets";
import type { Ticket, TicketRow } from "./tickets";

/**
 * Ticket server functions. Every call runs as the signed-in user, so the
 * database's row-level rules decide what they can see and create.
 * Request text is never written to logs — only error codes.
 */

const SAVE_FAILED = "Your request was classified but could not be saved. Please try again.";
const LOAD_FAILED = "Your tickets could not be loaded right now. Please try again.";

export const submitTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => submitTicketSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ticket: Ticket; duplicate: boolean }> => {
    const { supabase, userId } = context;

    // Retry safety: if this exact submission was already saved, return it.
    const existing = await supabase
      .from("tickets")
      .select(TICKET_COLUMNS)
      .eq("user_id", userId)
      .eq("client_request_id", data.clientRequestId)
      .maybeSingle();
    if (existing.error) {
      console.error("[tickets] lookup failed:", existing.error.code);
      throw new Error(LOAD_FAILED);
    }
    if (existing.data) return { ticket: toTicket(existing.data as TicketRow), duplicate: true };

    let signal: AbortSignal | undefined;
    try {
      signal = getRequest()?.signal;
    } catch {
      // No HTTP request context.
    }
    const result = await classifyRequest(data.text, signal);

    const inserted = await supabase
      .from("tickets")
      .insert(toTicketInsert(result, userId, data.clientRequestId))
      .select(TICKET_COLUMNS)
      .single();

    if (inserted.error) {
      // 23505 = a parallel retry saved it first; return that row instead.
      if (inserted.error.code === "23505") {
        const again = await supabase
          .from("tickets")
          .select(TICKET_COLUMNS)
          .eq("user_id", userId)
          .eq("client_request_id", data.clientRequestId)
          .single();
        if (!again.error) return { ticket: toTicket(again.data as TicketRow), duplicate: true };
      }
      console.error("[tickets] insert failed:", inserted.error.code);
      throw new Error(SAVE_FAILED);
    }
    return { ticket: toTicket(inserted.data as TicketRow), duplicate: false };
  });

export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Ticket[]> => {
    const { data, error } = await context.supabase
      .from("tickets")
      .select(TICKET_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("[tickets] list failed:", error.code);
      throw new Error(LOAD_FAILED);
    }
    return (data as TicketRow[]).map(toTicket);
  });
