CREATE TABLE IF NOT EXISTS public.etf_screening (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text UNIQUE NOT NULL,
  isin text,
  name text NOT NULL,
  etf_type text NOT NULL CHECK (etf_type IN ('islamic_certified', 'bond', 'conventional')),
  provider text,
  total_holdings integer NOT NULL DEFAULT 0,
  analyzed_holdings integer NOT NULL DEFAULT 0,
  compliant_weight numeric NOT NULL DEFAULT 0,
  doubtful_weight numeric NOT NULL DEFAULT 0,
  non_compliant_weight numeric NOT NULL DEFAULT 0,
  unanalyzed_weight numeric NOT NULL DEFAULT 0,
  purification_ratio numeric NOT NULL DEFAULT 0,
  verdict text CHECK (verdict IN ('compliant', 'doubtful', 'non_compliant', 'bond_forbidden')),
  verdict_reason text,
  top_non_compliant jsonb NOT NULL DEFAULT '[]'::jsonb,
  halal_alternative text,
  halal_alternative_name text,
  composition_date date,
  last_updated timestamptz NOT NULL DEFAULT now(),
  next_update timestamptz
);

CREATE TABLE IF NOT EXISTS public.etf_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etf_ticker text NOT NULL REFERENCES public.etf_screening(ticker) ON DELETE CASCADE,
  holding_ticker text,
  holding_isin text,
  holding_name text NOT NULL,
  weight numeric NOT NULL,
  halal_status text,
  halal_reason text,
  last_screened timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_etf_holdings_etf_ticker ON public.etf_holdings(etf_ticker);
CREATE INDEX IF NOT EXISTS idx_etf_holdings_halal_status ON public.etf_holdings(halal_status);

ALTER TABLE public.etf_screening ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etf_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ETF screening is publicly readable" ON public.etf_screening FOR SELECT USING (true);
CREATE POLICY "ETF holdings are publicly readable" ON public.etf_holdings FOR SELECT USING (true);
