CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  subscribed boolean NOT NULL DEFAULT false,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_active_idx
  ON public.newsletter_subscribers (subscribed) WHERE subscribed;

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their newsletter preference" ON public.newsletter_subscribers;
CREATE POLICY "Users can read their newsletter preference" ON public.newsletter_subscribers FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their newsletter preference" ON public.newsletter_subscribers;
CREATE POLICY "Users can insert their newsletter preference" ON public.newsletter_subscribers FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their newsletter preference" ON public.newsletter_subscribers;
CREATE POLICY "Users can update their newsletter preference" ON public.newsletter_subscribers FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.set_newsletter_subscriber_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS newsletter_subscribers_set_updated_at ON public.newsletter_subscribers;
CREATE TRIGGER newsletter_subscribers_set_updated_at BEFORE UPDATE ON public.newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION public.set_newsletter_subscriber_updated_at();

-- A new user may need to confirm their email before a client session exists.
-- The explicit opt-in is passed in Auth metadata and copied server-side here.
CREATE OR REPLACE FUNCTION public.create_newsletter_subscriber_from_auth() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE opted_in boolean;
BEGIN
  opted_in := COALESCE((NEW.raw_user_meta_data ->> 'newsletter_opt_in')::boolean, false);
  INSERT INTO public.newsletter_subscribers (user_id, email, subscribed, consented_at)
  VALUES (NEW.id, NEW.email, opted_in, CASE WHEN opted_in THEN now() ELSE NULL END)
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_newsletter_subscriber ON auth.users;
CREATE TRIGGER on_auth_user_created_newsletter_subscriber AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_newsletter_subscriber_from_auth();
