ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS zakat_payment_date date;
