const express = require('express');
const router = express.Router();
const {
  createReceipt,
  getReceipt,
  getReceiptsByDorm,
  getDefaultReceiptNote,
  saveDefaultReceiptNote,
  saveReceiptNote,
  saveReceiptNoteForRoom
} = require('../controllers/receiptController');
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 จัดการใบเสร็จ ─────────────── */

// สร้างใบเสร็จใหม่
router.post('/receipts/contracts/:contractId', authCheck, adminCheck, createReceipt);

// ดึงใบเสร็จของสัญญา
router.get('/receipts/contracts/:contractId', authCheck, adminCheck, getReceipt);

// บันทึกหมายเหตุในใบเสร็จของสัญญา
router.put('/receipts/contracts/:contractId/note', authCheck, adminCheck, saveReceiptNote);

// ดึงใบเสร็จทั้งหมดของหอพัก
router.get('/receipts/dormitories/:dormId', authCheck, adminCheck, getReceiptsByDorm);

// ดึงหมายเหตุเริ่มต้นสำหรับใบเสร็จ
router.get('/receipts/dormitories/:dormId/default-note', authCheck, adminCheck, getDefaultReceiptNote);

// บันทึกหมายเหตุเริ่มต้นสำหรับใบเสร็จ
router.post('/receipts/dormitories/:dormId/default-note', authCheck, adminCheck, saveDefaultReceiptNote);

// บันทึกหมายเหตุสำหรับห้องปัจจุบัน
router.put('/receipts/dormitories/:dormId/rooms/:roomNumber/note', authCheck, adminCheck, saveReceiptNoteForRoom);

module.exports = router;