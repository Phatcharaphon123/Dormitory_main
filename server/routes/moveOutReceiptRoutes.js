const express = require('express');
const router = express.Router();
const {
  getMoveOutReceiptData,
  getMoveOutReceiptById,
  getMoveOutReceiptsByMonth
} = require('../controllers/moveOutReceiptController');
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 ใบเสร็จย้ายออก ─────────────── */

// ดึงใบเสร็จย้ายออกตามเดือน (ต้องมาก่อน /:moveOutReceiptId)
router.get('/dormitories/:dormId', authCheck, staffCheck, getMoveOutReceiptsByMonth);

// ดึงข้อมูลใบเสร็จย้ายออกตามห้อง
router.get('/dormitories/:dormId/rooms/:roomNumber', authCheck, staffCheck, getMoveOutReceiptData);

// ดึงใบเสร็จย้ายออกตาม ID (ต้องมาหลังสุดเพราะเป็น generic route)
router.get('/:moveOutReceiptId', authCheck, staffCheck, getMoveOutReceiptById);

module.exports = router;
