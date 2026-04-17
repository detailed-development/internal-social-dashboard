-- Scope app passwords per client + platform instead of one shared row per platform.
ALTER TABLE "platform_app_passwords"
  ADD COLUMN "client_id" UUID;

ALTER TABLE "platform_app_passwords"
  ADD CONSTRAINT "platform_app_passwords_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients" ("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

DROP INDEX "platform_app_passwords_platform_key";

CREATE TEMP TABLE "_platform_app_password_clone_map" (
  "old_id"    TEXT NOT NULL,
  "new_id"    TEXT NOT NULL,
  "client_id" UUID NOT NULL,
  PRIMARY KEY ("old_id", "client_id")
);

INSERT INTO "_platform_app_password_clone_map" ("old_id", "new_id", "client_id")
SELECT
  p."id" AS "old_id",
  md5(random()::text || clock_timestamp()::text || sa."client_id"::text || p."id") AS "new_id",
  sa."client_id"
FROM "platform_app_passwords" p
JOIN (
  SELECT DISTINCT "client_id", "platform"
  FROM "social_accounts"
) sa
  ON sa."platform" = p."platform";

INSERT INTO "platform_app_passwords" ("id", "client_id", "platform", "password", "updated_at")
SELECT
  map."new_id",
  map."client_id",
  p."platform",
  p."password",
  p."updated_at"
FROM "_platform_app_password_clone_map" map
JOIN "platform_app_passwords" p
  ON p."id" = map."old_id";

INSERT INTO "platform_app_password_history" (
  "id",
  "platform_app_password_id",
  "platform",
  "password",
  "changed_by",
  "changed_at"
)
SELECT
  md5(random()::text || clock_timestamp()::text || h."id" || map."new_id"),
  map."new_id",
  h."platform",
  h."password",
  h."changed_by",
  h."changed_at"
FROM "platform_app_password_history" h
JOIN "_platform_app_password_clone_map" map
  ON map."old_id" = h."platform_app_password_id";

DELETE FROM "platform_app_password_history"
WHERE "platform_app_password_id" IN (
  SELECT "id"
  FROM "platform_app_passwords"
  WHERE "client_id" IS NULL
);

DELETE FROM "platform_app_passwords"
WHERE "client_id" IS NULL;

ALTER TABLE "platform_app_passwords"
  ALTER COLUMN "client_id" SET NOT NULL;

CREATE UNIQUE INDEX "platform_app_passwords_client_id_platform_key"
  ON "platform_app_passwords" ("client_id", "platform");

DROP INDEX "platform_app_password_history_platform_changed_at_idx";

CREATE INDEX "platform_app_password_history_platform_app_password_id_changed_at_idx"
  ON "platform_app_password_history" ("platform_app_password_id", "changed_at" DESC);
