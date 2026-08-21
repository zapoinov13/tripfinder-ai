CREATE TABLE public.ai_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider text NOT NULL DEFAULT 'lovable',
  model text NOT NULL DEFAULT 'openai/gpt-5.6-sol',
  base_url text NOT NULL DEFAULT '',
  api_key text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  system_prompt text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ai_settings TO service_role;

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: the API key is only reachable from
-- trusted server code (service role). Admin UI goes through server functions.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_ai_settings_updated_at
BEFORE UPDATE ON public.ai_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ai_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;