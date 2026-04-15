-- CreateTable: content_pillars
CREATE TABLE "content_pillars" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_pillars_pkey" PRIMARY KEY ("id")
);

-- CreateTable: post_content_pillars
CREATE TABLE "post_content_pillars" (
    "post_id" TEXT NOT NULL,
    "content_pillar_id" TEXT NOT NULL,
    CONSTRAINT "post_content_pillars_pkey" PRIMARY KEY ("post_id","content_pillar_id")
);

-- CreateIndex
CREATE INDEX "content_pillars_client_id_idx" ON "content_pillars"("client_id");

-- AddForeignKey
ALTER TABLE "content_pillars" ADD CONSTRAINT "content_pillars_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_content_pillars" ADD CONSTRAINT "post_content_pillars_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_content_pillars" ADD CONSTRAINT "post_content_pillars_content_pillar_id_fkey"
    FOREIGN KEY ("content_pillar_id") REFERENCES "content_pillars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
