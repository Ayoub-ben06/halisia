-- Full screening result, reused by /api/alpha-screening and the app pages.
ALTER TABLE public.screening_cache ADD COLUMN IF NOT EXISTS result jsonb;

-- Users can edit and delete their own positions.
DROP POLICY IF EXISTS "Users can update their own assets" ON public.assets;
CREATE POLICY "Users can update their own assets" ON public.assets
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own assets" ON public.assets;
CREATE POLICY "Users can delete their own assets" ON public.assets
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own crypto assets" ON public.crypto_assets;
CREATE POLICY "Users can insert their own crypto assets" ON public.crypto_assets
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own crypto assets" ON public.crypto_assets;
CREATE POLICY "Users can update their own crypto assets" ON public.crypto_assets
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own crypto assets" ON public.crypto_assets;
CREATE POLICY "Users can delete their own crypto assets" ON public.crypto_assets
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own gold assets" ON public.gold_assets;
CREATE POLICY "Users can insert their own gold assets" ON public.gold_assets
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own gold assets" ON public.gold_assets;
CREATE POLICY "Users can update their own gold assets" ON public.gold_assets
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own gold assets" ON public.gold_assets;
CREATE POLICY "Users can delete their own gold assets" ON public.gold_assets
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Transaction history for every asset class, with buy/sell side.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_asset_class_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_asset_class_check
  CHECK (asset_class IN ('stock', 'etf', 'crypto', 'gold', 'cash'));
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS side text NOT NULL DEFAULT 'buy';
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_side_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_side_check CHECK (side IN ('buy', 'sell'));
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS account_type text;
ALTER TABLE public.transactions ALTER COLUMN transaction_id SET DEFAULT gen_random_uuid()::text;

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
CREATE POLICY "Users can delete their own transactions" ON public.transactions
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own watchlist" ON public.watchlist;
CREATE POLICY "Users can update their own watchlist" ON public.watchlist
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Zakat payments, replacing the browser-only "paid" flag.
CREATE TABLE IF NOT EXISTS public.zakat_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paid_at date NOT NULL DEFAULT current_date,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS zakat_payments_user_idx ON public.zakat_payments (user_id, paid_at DESC);
ALTER TABLE public.zakat_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own zakat payments" ON public.zakat_payments;
CREATE POLICY "Users can read their own zakat payments" ON public.zakat_payments
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own zakat payments" ON public.zakat_payments;
CREATE POLICY "Users can insert their own zakat payments" ON public.zakat_payments
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own zakat payments" ON public.zakat_payments;
CREATE POLICY "Users can delete their own zakat payments" ON public.zakat_payments
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
