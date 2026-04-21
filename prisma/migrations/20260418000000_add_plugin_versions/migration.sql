-- Add version label column to plugins (mirrors latest PluginVersion.version)
ALTER TABLE "plugins" ADD COLUMN "version" TEXT;

-- History table for plugin file uploads
CREATE TABLE "plugin_versions" (
    "id"               TEXT PRIMARY KEY,
    "plugin_id"        TEXT NOT NULL,
    "version"          TEXT,
    "file_name"        TEXT,
    "file_type"        TEXT,
    "file_size"        INTEGER,
    "mime_type"        TEXT,
    "storage_provider" TEXT,
    "storage_key"      TEXT,
    "download_url"     TEXT,
    "ingest_status"    TEXT NOT NULL DEFAULT 'ready',
    "ingest_error"     TEXT,
    "uploaded_at"      TIMESTAMP(3),
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plugin_versions_plugin_id_fkey" FOREIGN KEY ("plugin_id")
        REFERENCES "plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "plugin_versions_plugin_id_idx" ON "plugin_versions"("plugin_id");

-- Backfill: every plugin that already has a stored file gets a v1 history row.
-- This preserves Bunny-hosted files as the first version of their plugin.
INSERT INTO "plugin_versions" (
    "id", "plugin_id", "version",
    "file_name", "file_type", "file_size", "mime_type",
    "storage_provider", "storage_key", "download_url",
    "ingest_status", "ingest_error", "uploaded_at", "created_at"
)
SELECT
    'v1_' || "id",
    "id",
    'v1',
    "file_name", "file_type", "file_size", "mime_type",
    "storage_provider", "storage_key", "download_url",
    "ingest_status", "ingest_error", "uploaded_at",
    COALESCE("uploaded_at", "created_at")
FROM "plugins"
WHERE "storage_key" IS NOT NULL;

-- Seed the mirrored version label on plugins for rows we just backfilled.
UPDATE "plugins" SET "version" = 'v1' WHERE "storage_key" IS NOT NULL;
