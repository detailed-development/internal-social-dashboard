-- CreateTable
CREATE TABLE "ai_generations" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "cache_key" TEXT NOT NULL,
    "client_id" TEXT,
    "model" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "input_hash" TEXT NOT NULL,
    "date_range_start" TIMESTAMP(3),
    "date_range_end" TIMESTAMP(3),
    "response_format" TEXT NOT NULL DEFAULT 'markdown',
    "response_body" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "ai_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_generations_cache_key_key" ON "ai_generations"("cache_key");

-- CreateIndex
CREATE INDEX "ai_generations_feature_client_id_idx" ON "ai_generations"("feature", "client_id");

-- CreateIndex
CREATE INDEX "ai_generations_created_at_idx" ON "ai_generations"("created_at");

-- CreateIndex
CREATE INDEX "ai_generations_expires_at_idx" ON "ai_generations"("expires_at");
