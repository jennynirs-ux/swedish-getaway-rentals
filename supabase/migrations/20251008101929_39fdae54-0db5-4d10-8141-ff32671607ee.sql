-- Add missing is_admin column used by RLS helper functions
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Optional: ensure existing NULLs become false (in case column existed but nullable)
UPDATE public.profiles SET is_admin = COALESCE(is_admin, false);

-- No further policy changes needed; functions like is_user_admin_safe(auth.uid()) will now work.
