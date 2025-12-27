/*
  Warnings:

  - You are about to alter the column `amount` on the `invoice_receipt_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,0)` to `Decimal`.

*/
-- AlterTable
ALTER TABLE `invoice_receipt_items` MODIFY `amount` DECIMAL NULL;
