/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'OWNER', 'STAFF', 'TENANT', 'TECHNICIAN');

-- DropForeignKey
ALTER TABLE "dormitories" DROP CONSTRAINT "fk_dormitories_user";

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "user_id" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'OWNER';

-- CreateTable
CREATE TABLE "dorm_staffs" (
    "user_id" INTEGER NOT NULL,
    "dorm_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dorm_staffs_pkey" PRIMARY KEY ("user_id","dorm_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_user_id_key" ON "tenants"("user_id");

-- AddForeignKey
ALTER TABLE "dormitories" ADD CONSTRAINT "fk_dormitories_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dorm_staffs" ADD CONSTRAINT "dorm_staffs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dorm_staffs" ADD CONSTRAINT "dorm_staffs_dorm_id_fkey" FOREIGN KEY ("dorm_id") REFERENCES "dormitories"("dorm_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
