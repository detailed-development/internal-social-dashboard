-- CreateTable
CREATE TABLE "client_platform_daily_metrics" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "social_account_id" TEXT,
    "date" DATE NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" TEXT,
    "follower_count" INTEGER NOT NULL DEFAULT 0,
    "posts_count" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_platform_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_post_performance" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "social_account_id" TEXT,
    "post_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "platform" "Platform" NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "caption_preview" VARCHAR(160),
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_post_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_web_daily_metrics" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "users" INTEGER NOT NULL DEFAULT 0,
    "new_users" INTEGER NOT NULL DEFAULT 0,
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "bounce_rate_avg" DECIMAL(6,2),
    "avg_session_duration" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_web_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_traffic_source_daily" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "users" INTEGER NOT NULL DEFAULT 0,
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_traffic_source_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_device_daily" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "device" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "users" INTEGER NOT NULL DEFAULT 0,
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_device_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_page_daily" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "users" INTEGER NOT NULL DEFAULT 0,
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_page_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_buzzword_daily" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "word" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_buzzword_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_report_input_snapshots" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "date_range_start" DATE NOT NULL,
    "date_range_end" DATE NOT NULL,
    "input_version" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_report_input_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_platform_daily_metrics_client_id_date_idx" ON "client_platform_daily_metrics"("client_id", "date");

-- CreateIndex
CREATE INDEX "client_platform_daily_metrics_client_id_platform_date_idx" ON "client_platform_daily_metrics"("client_id", "platform", "date");

-- CreateIndex
CREATE UNIQUE INDEX "client_platform_daily_metrics_client_id_date_platform_socia_key" ON "client_platform_daily_metrics"("client_id", "date", "platform", "social_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_post_performance_post_id_key" ON "client_post_performance"("post_id");

-- CreateIndex
CREATE INDEX "client_post_performance_client_id_date_idx" ON "client_post_performance"("client_id", "date");

-- CreateIndex
CREATE INDEX "client_post_performance_client_id_engagement_date_idx" ON "client_post_performance"("client_id", "engagement" DESC, "date");

-- CreateIndex
CREATE INDEX "client_post_performance_client_id_platform_date_idx" ON "client_post_performance"("client_id", "platform", "date");

-- CreateIndex
CREATE INDEX "client_post_performance_client_id_media_type_date_idx" ON "client_post_performance"("client_id", "media_type", "date");

-- CreateIndex
CREATE INDEX "client_web_daily_metrics_client_id_date_idx" ON "client_web_daily_metrics"("client_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "client_web_daily_metrics_client_id_date_key" ON "client_web_daily_metrics"("client_id", "date");

-- CreateIndex
CREATE INDEX "client_traffic_source_daily_client_id_date_idx" ON "client_traffic_source_daily"("client_id", "date");

-- CreateIndex
CREATE INDEX "client_traffic_source_daily_client_id_source_medium_date_idx" ON "client_traffic_source_daily"("client_id", "source", "medium", "date");

-- CreateIndex
CREATE UNIQUE INDEX "client_traffic_source_daily_client_id_date_source_medium_key" ON "client_traffic_source_daily"("client_id", "date", "source", "medium");

-- CreateIndex
CREATE INDEX "client_device_daily_client_id_date_idx" ON "client_device_daily"("client_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "client_device_daily_client_id_date_device_key" ON "client_device_daily"("client_id", "date", "device");

-- CreateIndex
CREATE INDEX "client_page_daily_client_id_date_idx" ON "client_page_daily"("client_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "client_page_daily_client_id_date_path_key" ON "client_page_daily"("client_id", "date", "path");

-- CreateIndex
CREATE INDEX "client_buzzword_daily_client_id_date_idx" ON "client_buzzword_daily"("client_id", "date");

-- CreateIndex
CREATE INDEX "client_buzzword_daily_client_id_word_date_idx" ON "client_buzzword_daily"("client_id", "word", "date");

-- CreateIndex
CREATE UNIQUE INDEX "client_buzzword_daily_client_id_date_word_key" ON "client_buzzword_daily"("client_id", "date", "word");

-- CreateIndex
CREATE INDEX "client_report_input_snapshots_client_id_feature_date_range__idx" ON "client_report_input_snapshots"("client_id", "feature", "date_range_start", "date_range_end");

-- CreateIndex
CREATE UNIQUE INDEX "client_report_input_snapshots_client_id_feature_date_range__key" ON "client_report_input_snapshots"("client_id", "feature", "date_range_start", "date_range_end", "input_version");

-- AddForeignKey
ALTER TABLE "client_platform_daily_metrics" ADD CONSTRAINT "client_platform_daily_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_post_performance" ADD CONSTRAINT "client_post_performance_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_web_daily_metrics" ADD CONSTRAINT "client_web_daily_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_traffic_source_daily" ADD CONSTRAINT "client_traffic_source_daily_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_device_daily" ADD CONSTRAINT "client_device_daily_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_page_daily" ADD CONSTRAINT "client_page_daily_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_buzzword_daily" ADD CONSTRAINT "client_buzzword_daily_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_report_input_snapshots" ADD CONSTRAINT "client_report_input_snapshots_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

