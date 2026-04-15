-- CreateTable: client_report_styles
CREATE TABLE "client_report_styles" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "selected_modules" JSONB NOT NULL,
    "display_order" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_report_styles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_report_styles_client_id_idx" ON "client_report_styles"("client_id");

-- AddForeignKey
ALTER TABLE "client_report_styles" ADD CONSTRAINT "client_report_styles_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
