const express = require('express');
const router = express.Router();
const {
  getMoveOutReceiptData,
  getMoveOutReceiptById,
  getMoveOutReceiptsByMonth
} = require('../controllers/moveOutReceiptController');
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 ใบเสร็จย้ายออก ─────────────── */

// ดึงใบเสร็จย้ายออกตามเดือน (ต้องมาก่อน /:moveOutReceiptId)
router.get('/move-out-receipts/dormitories/:dormId', authCheck, adminCheck, getMoveOutReceiptsByMonth);

// ดึงข้อมูลใบเสร็จย้ายออกตามห้อง
router.get('/move-out-receipts/dormitories/:dormId/rooms/:roomNumber', authCheck, adminCheck, getMoveOutReceiptData);

// ดึงใบเสร็จย้ายออกตาม ID (ต้องมาหลังสุดเพราะเป็น generic route)
router.get('/move-out-receipts/:moveOutReceiptId', authCheck, adminCheck, getMoveOutReceiptById);

module.exports = router;
