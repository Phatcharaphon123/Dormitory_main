const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 จัดการใบเสร็จ ─────────────── */

// สร้างใบเสร็จใหม่
router.post('/contracts/:contractId', authMiddleware, receiptController.createReceipt);

// ดึงใบเสร็จของสัญญา
router.get('/contracts/:contractId', authMiddleware, receiptController.getReceipt);

// บันทึกหมายเหตุในใบเสร็จของสัญญา
router.put('/contracts/:contractId/note', authMiddleware, receiptController.saveReceiptNote);

// ดึงใบเสร็จทั้งหมดของหอพัก
router.get('/dormitories/:dormId', authMiddleware, receiptController.getReceiptsByDorm);

// ดึงหมายเหตุเริ่มต้นสำหรับใบเสร็จ
router.get('/dormitories/:dormId/default-note', authMiddleware, receiptController.getDefaultReceiptNote);

// บันทึกหมายเหตุเริ่มต้นสำหรับใบเสร็จ
router.post('/dormitories/:dormId/default-note', authMiddleware, receiptController.saveDefaultReceiptNote);

// บันทึกหมายเหตุสำหรับห้องปัจจุบัน
router.put('/dormitories/:dormId/rooms/:roomNumber/note', authMiddleware, receiptController.saveReceiptNoteForRoom);

module.exports = router;