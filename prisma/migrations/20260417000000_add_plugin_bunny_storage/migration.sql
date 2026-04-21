-- AlterTable
ALTER TABLE "plugins"
  ADD COLUMN "storage_provider" TEXT,
  ADD COLUMN "storage_key"      TEXT,
  ADD COLUMN "file_size"        INTEGER,
  ADD COLUMN "mime_type"        TEXT,
  ADD COLUMN "ingest_status"    TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN "ingest_error"     TEXT,
  ADD COLUMN "uploaded_at"      TIMESTAMP(3);
