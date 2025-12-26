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
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 จัดการบิล ─────────────── */
// ดึงรายการบันทึกมิเตอร์ตามหอพัก
router.get('/bills/dormitories/:dormId/meter-records', authCheck, adminCheck , getMeterRecordsByDorm);

// ดึงรายการห้องตามบันทึกมิเตอร์
router.get('/bills/dormitories/:dormId/meter-records/:meterRecordId/rooms', authCheck, adminCheck, getRoomsByMeterRecordId);

// สร้างใบแจ้งหนี้
router.post('/bills/dormitories/:dormId/invoices', authCheck, adminCheck, createInvoices);

// ดึงรายการเดือนที่มีใบแจ้งหนี้
router.get('/bills/dormitories/:dormId/invoices/available-months', authCheck, adminCheck, getAvailableInvoiceMonths);

// ดึงใบแจ้งหนี้ตามเดือน
router.get('/bills/dormitories/:dormId/invoices/by-month', authCheck, adminCheck, getInvoicesByDormAndMonth);

/* ─────────────── 🔹 ใบแจ้งหนี้ทั้งหมด ─────────────── */

// ดึงใบแจ้งหนี้ทั้งหมดตามหอพัก
router.get('/bills/dormitories/:dormId/invoices/all', authCheck, adminCheck, getAllInvoicesByDorm);

/* ─────────────── 🔹 ใบแจ้งหนี้ค้างชำระ ─────────────── */

// ดึงใบแจ้งหนี้ค้างชำระตามหอพัก
router.get('/bills/dormitories/:dormId/invoices/pending', authCheck, adminCheck, getPendingInvoicesByDorm);

// ลบใบแจ้งหนี้ที่ยังไม่ชำระ
router.delete('/bills/dormitories/:dormId/invoices/unpaid', authCheck, adminCheck, deleteUnpaidBills);

/* ─────────────── 🔹 รายละเอียดใบแจ้งหนี้ ─────────────── */

// ดึงรายการรายการในใบแจ้งหนี้
router.get('/bills/dormitories/:dormId/invoices/:invoiceId', authCheck, adminCheck, getInvoiceItemsByInvoiceId);

// ลบใบแจ้งหนี้เดี่ยว    
router.delete('/bills/dormitories/:dormId/invoices/:invoiceId', authCheck, adminCheck, deleteSingleInvoice);

// เพิ่มรายการในใบแจ้งหนี้
router.post('/bills/dormitories/:dormId/invoices/:invoiceId/items', authCheck, adminCheck, addInvoiceItem);

// แก้ไขรายการในใบแจ้งหนี้
router.put('/bills/dormitories/:dormId/invoices/:invoiceId/items/:itemId', authCheck, adminCheck, updateInvoiceItem);

// ลบรายการในใบแจ้งหนี้
router.delete('/bills/dormitories/:dormId/invoices/:invoiceId/items/:itemId', authCheck, adminCheck, deleteInvoiceItem);

/* ─────────────── 🔹 การชำระเงิน ─────────────── */

// บันทึกการชำระเงิน
router.post('/bills/dormitories/:dormId/invoices/:invoiceId/payments', authCheck, adminCheck, recordPayment);

// ดึงประวัติการชำระเงิน
router.get('/bills/dormitories/:dormId/invoices/:invoiceId/payments', authCheck, adminCheck, getPaymentHistory);

// ลบการชำระเงิน
router.delete('/bills/dormitories/:dormId/invoices/:invoiceId/payments/:paymentId', authCheck, adminCheck, deletePayment);

// ดึงใบเสร็จรับเงินตามหอพัก
router.get('/bills/dormitories/:dormId/payment-receipts', authCheck, adminCheck, getPaymentReceiptsByDorm);

// ส่งใบแจ้งหนี้ทางอีเมล
router.post('/bills/dormitories/:dormId/invoices/send-email', authCheck, adminCheck, sendInvoicesByEmail);

// ทดสอบการเชื่อมต่ออีเมล
router.get('/bills/dormitories/:dormId/test-email', authCheck, adminCheck, testEmailConnection);

// ดึงประวัติการส่งบิล
router.get('/bills/dormitories/:dormId/send-history', authCheck, adminCheck, getBillSendHistory);

/* ─────────────── 🔹 ใบแจ้งหนี้สัญญา ─────────────── */

// ดึงบิลตามสัญญา
router.get('/bills/contracts/:contractId', authCheck, adminCheck, getBillsByContract);

module.exports = router;
