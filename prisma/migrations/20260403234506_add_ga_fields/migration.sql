-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "ga_property_id" TEXT,
ADD COLUMN     "gtm_container_id" TEXT,
ADD COLUMN     "website_url" TEXT;

-- CreateTable
CREATE TABLE "web_analytics" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "users" INTEGER NOT NULL DEFAULT 0,
    "new_users" INTEGER NOT NULL DEFAULT 0,
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "bounce_rate" DOUBLE PRECISION,
    "avg_session_duration" DOUBLE PRECISION,
    "source" TEXT,
    "medium" TEXT,

    CONSTRAINT "web_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "web_analytics_client_id_date_idx" ON "web_analytics"("client_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "web_analytics_client_id_date_source_medium_key" ON "web_analytics"("client_id", "date", "source", "medium");

-- AddForeignKey
ALTER TABLE "web_analytics" ADD CONSTRAINT "web_analytics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
