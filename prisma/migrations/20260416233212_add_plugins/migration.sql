-- AlterTable
ALTER TABLE "client_report_styles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "content_pillars" ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "platform_app_password_history" RENAME CONSTRAINT "platform_app_password_history_parent_fkey" TO "platform_app_password_history_platform_app_password_id_fkey";
