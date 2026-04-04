-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'TWITTER');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'PENDING');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('POST', 'REEL', 'STORY', 'VIDEO', 'TWEET', 'SHORT');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "avatar_color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "display_name" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_status" "TokenStatus" NOT NULL DEFAULT 'PENDING',
    "token_expires_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "follower_count" INTEGER,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "social_account_id" TEXT NOT NULL,
    "platform_post_id" TEXT NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "caption" TEXT,
    "permalink" TEXT,
    "media_url" TEXT,
    "thumbnail_url" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_metrics" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "video_plays" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DOUBLE PRECISION,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "platform_comment_id" TEXT NOT NULL,
    "author_name" TEXT,
    "body" TEXT NOT NULL,
    "sentiment_score" DOUBLE PRECISION,
    "posted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcriptions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "transcript_text" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "confidence" DOUBLE PRECISION,
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buzzwords" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT,
    "transcription_id" TEXT,
    "word" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "relevance_score" DOUBLE PRECISION,
    "extracted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buzzwords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_slug_key" ON "clients"("slug");

-- CreateIndex
CREATE INDEX "social_accounts_client_id_idx" ON "social_accounts"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_platform_platform_user_id_key" ON "social_accounts"("platform", "platform_user_id");

-- CreateIndex
CREATE INDEX "posts_social_account_id_published_at_idx" ON "posts"("social_account_id", "published_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "posts_social_account_id_platform_post_id_key" ON "posts"("social_account_id", "platform_post_id");

-- CreateIndex
CREATE INDEX "post_metrics_post_id_recorded_at_idx" ON "post_metrics"("post_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "comments_post_id_posted_at_idx" ON "comments"("post_id", "posted_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "comments_post_id_platform_comment_id_key" ON "comments"("post_id", "platform_comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "transcriptions_post_id_key" ON "transcriptions"("post_id");

-- CreateIndex
CREATE INDEX "buzzwords_word_idx" ON "buzzwords"("word");

-- CreateIndex
CREATE INDEX "buzzwords_comment_id_idx" ON "buzzwords"("comment_id");

-- CreateIndex
CREATE INDEX "buzzwords_transcription_id_idx" ON "buzzwords"("transcription_id");

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_metrics" ADD CONSTRAINT "post_metrics_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buzzwords" ADD CONSTRAINT "buzzwords_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buzzwords" ADD CONSTRAINT "buzzwords_transcription_id_fkey" FOREIGN KEY ("transcription_id") REFERENCES "transcriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
