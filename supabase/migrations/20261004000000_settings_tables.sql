CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.zakat_profile (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  start_date date NOT NULL,
  include_bitcoin boolean NOT NULL DEFAULT false,
  include_income boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.premium_waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS nisab_type text NOT NULL DEFAULT 'gold',
  ADD COLUMN IF NOT EXISTS fiscal_year_start text NOT NULL DEFAULT 'january',
  ADD COLUMN IF NOT EXISTS halal_change_alert boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS purification_alert boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS weekly_compliance_report boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS zakat_reminder boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bitcoin_zakatable boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zakat_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own profile" ON public.user_profiles;
CREATE POLICY "Users can read their own profile" ON public.user_profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can read their own zakat profile" ON public.zakat_profile;
CREATE POLICY "Users can read their own zakat profile" ON public.zakat_profile FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own zakat profile" ON public.zakat_profile;
CREATE POLICY "Users can insert their own zakat profile" ON public.zakat_profile FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own zakat profile" ON public.zakat_profile;
CREATE POLICY "Users can update their own zakat profile" ON public.zakat_profile FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read their own premium waitlist entry" ON public.premium_waitlist;
CREATE POLICY "Users can read their own premium waitlist entry" ON public.premium_waitlist FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id OR email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "Users can insert their own premium waitlist entry" ON public.premium_waitlist;
CREATE POLICY "Users can insert their own premium waitlist entry" ON public.premium_waitlist FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their avatar" ON storage.objects;
CREATE POLICY "Users can upload their avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
DROP POLICY IF EXISTS "Users can update their avatar" ON storage.objects;
CREATE POLICY "Users can update their avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
CREATE POLICY "Public can read avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
