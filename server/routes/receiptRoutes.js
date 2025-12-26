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
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 จัดการใบเสร็จ ─────────────── */

// สร้างใบเสร็จใหม่
router.post('/receipts/contracts/:contractId', authCheck, staffCheck, createReceipt);

// ดึงใบเสร็จของสัญญา
router.get('/receipts/contracts/:contractId', authCheck, staffCheck, getReceipt);

// บันทึกหมายเหตุในใบเสร็จของสัญญา
router.put('/receipts/contracts/:contractId/note', authCheck, staffCheck, saveReceiptNote);

// ดึงใบเสร็จทั้งหมดของหอพัก
router.get('/receipts/dormitories/:dormId', authCheck, staffCheck, getReceiptsByDorm);

// ดึงหมายเหตุเริ่มต้นสำหรับใบเสร็จ
router.get('/receipts/dormitories/:dormId/default-note', authCheck, staffCheck, getDefaultReceiptNote);

// บันทึกหมายเหตุเริ่มต้นสำหรับใบเสร็จ
router.post('/receipts/dormitories/:dormId/default-note', authCheck, staffCheck, saveDefaultReceiptNote);

// บันทึกหมายเหตุสำหรับห้องปัจจุบัน
router.put('/receipts/dormitories/:dormId/rooms/:roomNumber/note', authCheck, staffCheck, saveReceiptNoteForRoom);

module.exports = router;