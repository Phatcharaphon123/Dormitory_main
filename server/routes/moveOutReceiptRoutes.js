const express = require('express');
const router = express.Router();
const {
  getMoveOutReceiptData,
  getMoveOutReceiptById,
  getMoveOutReceiptsByMonth
} = require('../controllers/moveOutReceiptController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 ใบเสร็จย้ายออก ─────────────── */

// ดึงใบเสร็จย้ายออกตามเดือน (ต้องมาก่อน /:moveOutReceiptId)
router.get('/dormitories/:dormId', authMiddleware, getMoveOutReceiptsByMonth);

// ดึงข้อมูลใบเสร็จย้ายออกตามห้อง
router.get('/dormitories/:dormId/rooms/:roomNumber', authMiddleware, getMoveOutReceiptData);

// ดึงใบเสร็จย้ายออกตาม ID (ต้องมาหลังสุดเพราะเป็น generic route)
router.get('/:moveOutReceiptId', authMiddleware, getMoveOutReceiptById);

module.exports = router;
