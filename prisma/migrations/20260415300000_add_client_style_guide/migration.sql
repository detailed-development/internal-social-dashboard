-- CreateTable
CREATE TABLE "client_style_guides" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "fonts" TEXT,
    "primary_colors" JSONB,
    "secondary_colors" JSONB,
    "tone_of_voice" TEXT,
    "brand_guidelines" TEXT,
    "dos" JSONB,
    "donts" JSONB,
    "prompt_markdown" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_style_guides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_style_guides_client_id_key" ON "client_style_guides"("client_id");

-- AddForeignKey
ALTER TABLE "client_style_guides" ADD CONSTRAINT "client_style_guides_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
