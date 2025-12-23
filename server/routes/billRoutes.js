const express = require('express');
const router = express.Router();
const {
  getMeterRecordsByDorm,
  getRoomsByMeterRecordId,
  createInvoices,
  getAvailableInvoiceMonths,
  getInvoicesByDormAndMonth,
  getInvoiceItemsByInvoiceId,
  addInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  updateInvoiceTotal,
  updateLateFee,
  recordPayment,
  getPaymentHistory,
  deletePayment,
  deleteUnpaidBills,
  getAllInvoicesByDorm,
  getPendingInvoicesByDorm,
  deleteSingleInvoice,
  sendInvoicesByEmail,
  testEmailConnection,
  getBillSendHistory,
  getPaymentReceiptsByDorm,
  getBillsByContract
} = require('../controllers/billController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 จัดการบิล ─────────────── */
// ดึงรายการบันทึกมิเตอร์ตามหอพัก
router.get('/dormitories/:dormId/meter-records', authMiddleware, getMeterRecordsByDorm);

// ดึงรายการห้องตามบันทึกมิเตอร์
router.get('/dormitories/:dormId/meter-records/:meterRecordId/rooms', authMiddleware, getRoomsByMeterRecordId);

// สร้างใบแจ้งหนี้
router.post('/dormitories/:dormId/invoices', authMiddleware, createInvoices);

// ดึงรายการเดือนที่มีใบแจ้งหนี้
router.get('/dormitories/:dormId/invoices/available-months', authMiddleware, getAvailableInvoiceMonths);

// ดึงใบแจ้งหนี้ตามเดือน
router.get('/dormitories/:dormId/invoices/by-month', authMiddleware, getInvoicesByDormAndMonth);

/* ─────────────── 🔹 ใบแจ้งหนี้ทั้งหมด ─────────────── */

// ดึงใบแจ้งหนี้ทั้งหมดตามหอพัก
router.get('/dormitories/:dormId/invoices/all', authMiddleware, getAllInvoicesByDorm);

/* ─────────────── 🔹 ใบแจ้งหนี้ค้างชำระ ─────────────── */

// ดึงใบแจ้งหนี้ค้างชำระตามหอพัก
router.get('/dormitories/:dormId/invoices/pending', authMiddleware, getPendingInvoicesByDorm);

// ลบใบแจ้งหนี้ที่ยังไม่ชำระ
router.delete('/dormitories/:dormId/invoices/unpaid', authMiddleware, deleteUnpaidBills);

/* ─────────────── 🔹 รายละเอียดใบแจ้งหนี้ ─────────────── */

// ดึงรายการรายการในใบแจ้งหนี้
router.get('/dormitories/:dormId/invoices/:invoiceId', authMiddleware, getInvoiceItemsByInvoiceId);

// ลบใบแจ้งหนี้เดี่ยว    
router.delete('/dormitories/:dormId/invoices/:invoiceId', authMiddleware, deleteSingleInvoice);

// เพิ่มรายการในใบแจ้งหนี้
router.post('/dormitories/:dormId/invoices/:invoiceId/items', authMiddleware, addInvoiceItem);

// แก้ไขรายการในใบแจ้งหนี้
router.put('/dormitories/:dormId/invoices/:invoiceId/items/:itemId', authMiddleware, updateInvoiceItem);

// ลบรายการในใบแจ้งหนี้
router.delete('/dormitories/:dormId/invoices/:invoiceId/items/:itemId', authMiddleware, deleteInvoiceItem);

/* ─────────────── 🔹 การชำระเงิน ─────────────── */

// บันทึกการชำระเงิน
router.post('/dormitories/:dormId/invoices/:invoiceId/payments', authMiddleware, recordPayment);

// ดึงประวัติการชำระเงิน
router.get('/dormitories/:dormId/invoices/:invoiceId/payments', authMiddleware, getPaymentHistory);

// ลบการชำระเงิน
router.delete('/dormitories/:dormId/invoices/:invoiceId/payments/:paymentId', authMiddleware, deletePayment);

// ดึงใบเสร็จรับเงินตามหอพัก
router.get('/dormitories/:dormId/payment-receipts', authMiddleware, getPaymentReceiptsByDorm);

// ส่งใบแจ้งหนี้ทางอีเมล
router.post('/dormitories/:dormId/invoices/send-email', authMiddleware, sendInvoicesByEmail);

// ทดสอบการเชื่อมต่ออีเมล
router.get('/dormitories/:dormId/test-email', authMiddleware, testEmailConnection);

// ดึงประวัติการส่งบิล
router.get('/dormitories/:dormId/send-history', authMiddleware, getBillSendHistory);

/* ─────────────── 🔹 ใบแจ้งหนี้สัญญา ─────────────── */

// ดึงบิลตามสัญญา
router.get('/contracts/:contractId', authMiddleware, getBillsByContract);

module.exports = router;
