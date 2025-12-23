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
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 จัดการใบเสร็จ ─────────────── */

// สร้างใบเสร็จใหม่
router.post('/contracts/:contractId', authMiddleware, createReceipt);

// ดึงใบเสร็จของสัญญา
router.get('/contracts/:contractId', authMiddleware, getReceipt);

// บันทึกหมายเหตุในใบเสร็จของสัญญา
router.put('/contracts/:contractId/note', authMiddleware, saveReceiptNote);

// ดึงใบเสร็จทั้งหมดของหอพัก
router.get('/dormitories/:dormId', authMiddleware, getReceiptsByDorm);

// ดึงหมายเหตุเริ่มต้นสำหรับใบเสร็จ
router.get('/dormitories/:dormId/default-note', authMiddleware, getDefaultReceiptNote);

// บันทึกหมายเหตุเริ่มต้นสำหรับใบเสร็จ
router.post('/dormitories/:dormId/default-note', authMiddleware, saveDefaultReceiptNote);

// บันทึกหมายเหตุสำหรับห้องปัจจุบัน
router.put('/dormitories/:dormId/rooms/:roomNumber/note', authMiddleware, saveReceiptNoteForRoom);

module.exports = router;