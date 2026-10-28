CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_request_id uuid NOT NULL,
  request_text text NOT NULL CHECK (char_length(btrim(request_text)) BETWEEN 10 AND 2000),
  -- Keep in sync with STORABLE_CATEGORY_IDS in src/lib/categories.ts (a test enforces this).
  category text NOT NULL CHECK (category IN ('HR', 'IT', 'FINANCE', 'OPERATIONS', 'UNCLASSIFIED')),
  confidence numeric(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  explanation text NOT NULL,
  status text NOT NULL CHECK (status IN ('classified', 'needs_review')),
  method text NOT NULL CHECK (method IN ('ai', 'keyword_fallback')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tickets_unclassified_needs_review CHECK (category <> 'UNCLASSIFIED' OR status = 'needs_review'),
  CONSTRAINT tickets_user_request_unique UNIQUE (user_id, client_request_id)
);

CREATE INDEX tickets_user_created_idx ON public.tickets (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);