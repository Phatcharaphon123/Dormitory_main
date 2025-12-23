const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 จัดการบิล ─────────────── */
// ดึงรายการบันทึกมิเตอร์ตามหอพัก
router.get('/dormitories/:dormId/meter-records', authMiddleware, billController.getMeterRecordsByDorm);

// ดึงรายการห้องตามบันทึกมิเตอร์
router.get('/dormitories/:dormId/meter-records/:meterRecordId/rooms', authMiddleware, billController.getRoomsByMeterRecordId);

// สร้างใบแจ้งหนี้
router.post('/dormitories/:dormId/invoices', authMiddleware, billController.createInvoices);

// ดึงรายการเดือนที่มีใบแจ้งหนี้
router.get('/dormitories/:dormId/invoices/available-months', authMiddleware, billController.getAvailableInvoiceMonths);

// ดึงใบแจ้งหนี้ตามเดือน
router.get('/dormitories/:dormId/invoices/by-month', authMiddleware, billController.getInvoicesByDormAndMonth);

/* ─────────────── 🔹 ใบแจ้งหนี้ทั้งหมด ─────────────── */

// ดึงใบแจ้งหนี้ทั้งหมดตามหอพัก
router.get('/dormitories/:dormId/invoices/all', authMiddleware, billController.getAllInvoicesByDorm);

/* ─────────────── 🔹 ใบแจ้งหนี้ค้างชำระ ─────────────── */

// ดึงใบแจ้งหนี้ค้างชำระตามหอพัก
router.get('/dormitories/:dormId/invoices/pending', authMiddleware, billController.getPendingInvoicesByDorm);

// ลบใบแจ้งหนี้ที่ยังไม่ชำระ
router.delete('/dormitories/:dormId/invoices/unpaid', authMiddleware, billController.deleteUnpaidBills);

/* ─────────────── 🔹 รายละเอียดใบแจ้งหนี้ ─────────────── */

// ดึงรายการรายการในใบแจ้งหนี้
router.get('/dormitories/:dormId/invoices/:invoiceId', authMiddleware, billController.getInvoiceItemsByInvoiceId);

// ลบใบแจ้งหนี้เดี่ยว
router.delete('/dormitories/:dormId/invoices/:invoiceId', authMiddleware, billController.deleteSingleInvoice);

// เพิ่มรายการในใบแจ้งหนี้
router.post('/dormitories/:dormId/invoices/:invoiceId/items', authMiddleware, billController.addInvoiceItem);

// แก้ไขรายการในใบแจ้งหนี้
router.put('/dormitories/:dormId/invoices/:invoiceId/items/:itemId', authMiddleware, billController.updateInvoiceItem);

// ลบรายการในใบแจ้งหนี้
router.delete('/dormitories/:dormId/invoices/:invoiceId/items/:itemId', authMiddleware, billController.deleteInvoiceItem);

/* ─────────────── 🔹 การชำระเงิน ─────────────── */

// บันทึกการชำระเงิน
router.post('/dormitories/:dormId/invoices/:invoiceId/payments', authMiddleware, billController.recordPayment);

// ดึงประวัติการชำระเงิน
router.get('/dormitories/:dormId/invoices/:invoiceId/payments', authMiddleware, billController.getPaymentHistory);

// ลบการชำระเงิน
router.delete('/dormitories/:dormId/invoices/:invoiceId/payments/:paymentId', authMiddleware, billController.deletePayment);

// ดึงใบเสร็จรับเงินตามหอพัก
router.get('/dormitories/:dormId/payment-receipts', authMiddleware, billController.getPaymentReceiptsByDorm);

// ส่งใบแจ้งหนี้ทางอีเมล
router.post('/dormitories/:dormId/invoices/send-email', authMiddleware, billController.sendInvoicesByEmail);

// ทดสอบการเชื่อมต่ออีเมล
router.get('/dormitories/:dormId/test-email', authMiddleware, billController.testEmailConnection);

// ดึงประวัติการส่งบิล
router.get('/dormitories/:dormId/send-history', authMiddleware, billController.getBillSendHistory);

/* ─────────────── 🔹 ใบแจ้งหนี้สัญญา ─────────────── */

// ดึงบิลตามสัญญา
router.get('/contracts/:contractId', authMiddleware, billController.getBillsByContract);

module.exports = router;
