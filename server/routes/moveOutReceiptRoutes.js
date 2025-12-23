const express = require('express');
const router = express.Router();
const {
  getMoveOutReceiptData,
  getMoveOutReceiptById,
  getMoveOutReceiptsByMonth
} = require('../controllers/moveOutReceiptController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 ใบเสร็จย้ายออก ─────────────── */

// ดึงใบเสร็จย้ายออกตาม ID
router.get('/:moveOutReceiptId', authMiddleware, getMoveOutReceiptById);

// Route สำหรับทดสอบ
router.get('/test', (req, res) => {
  console.log('🔥 Test route hit!');
  res.json({ message: 'Test route works!' });
});

// ดึงใบเสร็จย้ายออกตามเดือน
router.get('/dormitories/:dormId', authMiddleware, getMoveOutReceiptsByMonth);

// ดึงข้อมูลใบเสร็จย้ายออกตามห้อง
router.get('/dormitories/:dormId/rooms/:roomNumber', authMiddleware, getMoveOutReceiptData);

module.exports = router;
