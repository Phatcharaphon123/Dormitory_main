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
router.post('/contracts/:contractId', authCheck, staffCheck, createReceipt);

// ดึงใบเสร็จของสัญญา
router.get('/contracts/:contractId', authCheck, staffCheck, getReceipt);

// บันทึกหมายเหตุในใบเสร็จของสัญญา
router.put('/contracts/:contractId/note', authCheck, staffCheck, saveReceiptNote);

// ดึงใบเสร็จทั้งหมดของหอพัก
router.get('/dormitories/:dormId', authCheck, staffCheck, getReceiptsByDorm);

// ดึงหมายเหตุเริ่มต้นสำหรับใบเสร็จ
router.get('/dormitories/:dormId/default-note', authCheck, staffCheck, getDefaultReceiptNote);

// บันทึกหมายเหตุเริ่มต้นสำหรับใบเสร็จ
router.post('/dormitories/:dormId/default-note', authCheck, staffCheck, saveDefaultReceiptNote);

// บันทึกหมายเหตุสำหรับห้องปัจจุบัน
router.put('/dormitories/:dormId/rooms/:roomNumber/note', authCheck, staffCheck, saveReceiptNoteForRoom);

module.exports = router;