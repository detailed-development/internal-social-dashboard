-- Column-level security on social_accounts token columns.
--
-- Row Level Security (already enabled) blocks all table access for the anon
-- and authenticated roles. This migration adds a second, independent layer:
-- even if RLS were misconfigured or bypassed, the anon and authenticated roles
-- cannot read access_token or refresh_token at the column level.
--
-- The service_role used by the backend retains full access (it is a superuser
-- and column-level REVOKE does not apply to superusers in PostgreSQL).

REVOKE SELECT (access_token, refresh_token)
  ON TABLE public.social_accounts
  FROM anon, authenticated;
