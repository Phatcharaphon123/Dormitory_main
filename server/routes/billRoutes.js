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
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 จัดการบิล ─────────────── */
// ดึงรายการบันทึกมิเตอร์ตามหอพัก
router.get('/dormitories/:dormId/meter-records', authCheck, staffCheck , getMeterRecordsByDorm);

// ดึงรายการห้องตามบันทึกมิเตอร์
router.get('/dormitories/:dormId/meter-records/:meterRecordId/rooms', authCheck, staffCheck, getRoomsByMeterRecordId);

// สร้างใบแจ้งหนี้
router.post('/dormitories/:dormId/invoices', authCheck, staffCheck, createInvoices);

// ดึงรายการเดือนที่มีใบแจ้งหนี้
router.get('/dormitories/:dormId/invoices/available-months', authCheck, staffCheck, getAvailableInvoiceMonths);

// ดึงใบแจ้งหนี้ตามเดือน
router.get('/dormitories/:dormId/invoices/by-month', authCheck, staffCheck, getInvoicesByDormAndMonth);

/* ─────────────── 🔹 ใบแจ้งหนี้ทั้งหมด ─────────────── */

// ดึงใบแจ้งหนี้ทั้งหมดตามหอพัก
router.get('/dormitories/:dormId/invoices/all', authCheck, staffCheck, getAllInvoicesByDorm);

/* ─────────────── 🔹 ใบแจ้งหนี้ค้างชำระ ─────────────── */

// ดึงใบแจ้งหนี้ค้างชำระตามหอพัก
router.get('/dormitories/:dormId/invoices/pending', authCheck, staffCheck, getPendingInvoicesByDorm);

// ลบใบแจ้งหนี้ที่ยังไม่ชำระ
router.delete('/dormitories/:dormId/invoices/unpaid', authCheck, staffCheck, deleteUnpaidBills);

/* ─────────────── 🔹 รายละเอียดใบแจ้งหนี้ ─────────────── */

// ดึงรายการรายการในใบแจ้งหนี้
router.get('/dormitories/:dormId/invoices/:invoiceId', authCheck, staffCheck, getInvoiceItemsByInvoiceId);

// ลบใบแจ้งหนี้เดี่ยว    
router.delete('/dormitories/:dormId/invoices/:invoiceId', authCheck, staffCheck, deleteSingleInvoice);

// เพิ่มรายการในใบแจ้งหนี้
router.post('/dormitories/:dormId/invoices/:invoiceId/items', authCheck, staffCheck, addInvoiceItem);

// แก้ไขรายการในใบแจ้งหนี้
router.put('/dormitories/:dormId/invoices/:invoiceId/items/:itemId', authCheck, staffCheck, updateInvoiceItem);

// ลบรายการในใบแจ้งหนี้
router.delete('/dormitories/:dormId/invoices/:invoiceId/items/:itemId', authCheck, staffCheck, deleteInvoiceItem);

/* ─────────────── 🔹 การชำระเงิน ─────────────── */

// บันทึกการชำระเงิน
router.post('/dormitories/:dormId/invoices/:invoiceId/payments', authCheck, staffCheck, recordPayment);

// ดึงประวัติการชำระเงิน
router.get('/dormitories/:dormId/invoices/:invoiceId/payments', authCheck, staffCheck, getPaymentHistory);

// ลบการชำระเงิน
router.delete('/dormitories/:dormId/invoices/:invoiceId/payments/:paymentId', authCheck, staffCheck, deletePayment);

// ดึงใบเสร็จรับเงินตามหอพัก
router.get('/dormitories/:dormId/payment-receipts', authCheck, staffCheck, getPaymentReceiptsByDorm);

// ส่งใบแจ้งหนี้ทางอีเมล
router.post('/dormitories/:dormId/invoices/send-email', authCheck, staffCheck, sendInvoicesByEmail);

// ทดสอบการเชื่อมต่ออีเมล
router.get('/dormitories/:dormId/test-email', authCheck, staffCheck, testEmailConnection);

// ดึงประวัติการส่งบิล
router.get('/dormitories/:dormId/send-history', authCheck, staffCheck, getBillSendHistory);

/* ─────────────── 🔹 ใบแจ้งหนี้สัญญา ─────────────── */

// ดึงบิลตามสัญญา
router.get('/contracts/:contractId', authCheck, staffCheck, getBillsByContract);

module.exports = router;
