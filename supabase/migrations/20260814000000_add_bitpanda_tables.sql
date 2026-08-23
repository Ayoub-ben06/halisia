CREATE TABLE IF NOT EXISTS public.crypto_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  ticker text NOT NULL,
  quantity numeric NOT NULL,
  average_buy_price numeric NOT NULL,
  current_price numeric NOT NULL,
  total_invested numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  broker text NOT NULL DEFAULT 'bitpanda',
  halal_status text NOT NULL DEFAULT 'debated',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gold_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  ticker text NOT NULL DEFAULT 'XAU',
  quantity_grams numeric NOT NULL,
  average_buy_price_per_gram numeric NOT NULL,
  current_price_per_gram numeric NOT NULL,
  total_invested numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  broker text NOT NULL DEFAULT 'bitpanda',
  halal_status text NOT NULL DEFAULT 'compliant',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id text NOT NULL UNIQUE,
  asset_name text NOT NULL,
  asset_ticker text NOT NULL,
  asset_class text NOT NULL CHECK (asset_class IN ('crypto', 'gold')),
  transaction_date timestamptz NOT NULL,
  quantity numeric NOT NULL,
  price_eur numeric NOT NULL,
  amount_eur numeric NOT NULL,
  fee_eur numeric NOT NULL DEFAULT 0,
  broker text NOT NULL DEFAULT 'bitpanda',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crypto_assets_user_ticker_broker_key
  ON public.crypto_assets (user_id, ticker, broker);
CREATE UNIQUE INDEX IF NOT EXISTS gold_assets_user_ticker_broker_key
  ON public.gold_assets (user_id, ticker, broker);
CREATE INDEX IF NOT EXISTS transactions_user_date_idx
  ON public.transactions (user_id, transaction_date DESC);

ALTER TABLE public.crypto_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gold_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own crypto assets" ON public.crypto_assets;
CREATE POLICY "Users can read their own crypto assets"
  ON public.crypto_assets FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read their own gold assets" ON public.gold_assets;
CREATE POLICY "Users can read their own gold assets"
  ON public.gold_assets FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read their own transactions" ON public.transactions;
CREATE POLICY "Users can read their own transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
