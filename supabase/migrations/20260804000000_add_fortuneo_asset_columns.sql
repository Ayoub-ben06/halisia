CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker text,
  isin text,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('stock', 'etf')),
  quantity numeric NOT NULL,
  average_buy_price numeric NOT NULL,
  current_price numeric,
  currency text NOT NULL,
  broker text NOT NULL,
  account_type text CHECK (account_type IN ('PEA', 'CTO')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Keep the migration compatible with an assets table created before this import.
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS isin text;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS current_price numeric;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS account_type text;

CREATE INDEX IF NOT EXISTS assets_user_id_idx ON public.assets (user_id);
CREATE INDEX IF NOT EXISTS assets_isin_idx ON public.assets (isin);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own assets" ON public.assets;
CREATE POLICY "Users can read their own assets"
  ON public.assets
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
