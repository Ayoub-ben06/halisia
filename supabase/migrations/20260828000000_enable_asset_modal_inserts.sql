ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_type_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_type_check
  CHECK (type IN ('stock', 'etf', 'crypto', 'gold', 'cash'));

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_account_type_check;
ALTER TABLE public.assets ADD CONSTRAINT assets_account_type_check
  CHECK (account_type IN ('PEA', 'CTO', 'Compte crypto', 'Autre'));

ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS purchase_date date;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS halal_status text NOT NULL DEFAULT 'unknown';

DROP POLICY IF EXISTS "Users can insert their own assets" ON public.assets;
CREATE POLICY "Users can insert their own assets" ON public.assets
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS assets_user_ticker_purchase_key
  ON public.assets (user_id, ticker, purchase_date);
