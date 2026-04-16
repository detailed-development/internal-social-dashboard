-- Custom tools / plugins uploaded by users.
CREATE TABLE "plugins" (
  "id"           TEXT PRIMARY KEY,
  "title"        TEXT NOT NULL,
  "category"     TEXT NOT NULL DEFAULT 'General',
  "description"  TEXT,
  "content"      TEXT,
  "download_url" TEXT,
  "file_name"    TEXT,
  "file_type"    TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX "plugins_category_idx" ON "plugins" ("category");

-- Platform-wide app passwords (one per Platform enum value).
CREATE TABLE "platform_app_passwords" (
  "id"         TEXT PRIMARY KEY,
  "platform"   "Platform" NOT NULL,
  "password"   TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "platform_app_passwords_platform_key" ON "platform_app_passwords" ("platform");

-- Version history entries — one row per edit.
CREATE TABLE "platform_app_password_history" (
  "id"                       TEXT PRIMARY KEY,
  "platform_app_password_id" TEXT NOT NULL,
  "platform"                 "Platform" NOT NULL,
  "password"                 TEXT,
  "changed_by"               TEXT,
  "changed_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_app_password_history_parent_fkey"
    FOREIGN KEY ("platform_app_password_id")
    REFERENCES "platform_app_passwords" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "platform_app_password_history_platform_changed_at_idx"
  ON "platform_app_password_history" ("platform", "changed_at" DESC);
