-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "group_id" TEXT;

-- CreateTable
CREATE TABLE "client_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "avatar_color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "client_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_groups_slug_key" ON "client_groups"("slug");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "client_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
