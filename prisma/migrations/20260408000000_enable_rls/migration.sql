-- Enable Row Level Security on all public tables.
-- This blocks all access via the Supabase anon/authenticated roles through the
-- REST API, resolving the rls_disabled_in_public and sensitive_columns_exposed
-- security alerts. The service_role key used by the backend bypasses RLS and
-- continues to work without any policy changes.

ALTER TABLE "client_groups"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "posts"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_metrics"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comments"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transcriptions"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buzzwords"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "direct_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "web_analytics"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_generations"  ENABLE ROW LEVEL SECURITY;
