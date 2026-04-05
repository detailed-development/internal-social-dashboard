-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "social_account_id" TEXT NOT NULL,
    "platform_conversation_id" TEXT NOT NULL,
    "participant_name" TEXT,
    "participant_id" TEXT,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "platform_message_id" TEXT NOT NULL,
    "from_name" TEXT,
    "from_id" TEXT,
    "body" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "is_from_page" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_social_account_id_last_message_at_idx" ON "conversations"("social_account_id", "last_message_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_social_account_id_platform_conversation_id_key" ON "conversations"("social_account_id", "platform_conversation_id");

-- CreateIndex
CREATE INDEX "direct_messages_conversation_id_sent_at_idx" ON "direct_messages"("conversation_id", "sent_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "direct_messages_conversation_id_platform_message_id_key" ON "direct_messages"("conversation_id", "platform_message_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
