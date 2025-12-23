const express = require('express');
const router = express.Router();
const {
  getDormMeters,
  addElectricMeter,
  addWaterMeter,
  removeElectricMeter,
  removeWaterMeter
} = require('../controllers/meterController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 จัดการมิเตอร์ ─────────────── */

// ดึงมิเตอร์ทั้งหมดตามหอพัก
router.get('/dormitories/:dormId', authMiddleware, getDormMeters);

// เพิ่มมิเตอร์ไฟฟ้า
router.post('/electric', authMiddleware, addElectricMeter);

// เพิ่มมิเตอร์น้ำ
router.post('/water', authMiddleware, addWaterMeter);

// ลบมิเตอร์ไฟฟ้า
router.delete('/electric/:roomId', authMiddleware, removeElectricMeter);

// ลบมิเตอร์น้ำ
router.delete('/water/:roomId', authMiddleware, removeWaterMeter);

module.exports = router;
