const express = require('express');
const router = express.Router();
const meterController = require('../controllers/meterController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 จัดการมิเตอร์ ─────────────── */

// ดึงมิเตอร์ทั้งหมดตามหอพัก
router.get('/dormitories/:dormId', authMiddleware, meterController.getDormMeters);

// เพิ่มมิเตอร์ไฟฟ้า
router.post('/electric', authMiddleware, meterController.addElectricMeter);

// เพิ่มมิเตอร์น้ำ
router.post('/water', authMiddleware, meterController.addWaterMeter);

// ลบมิเตอร์ไฟฟ้า
router.delete('/electric/:roomId', authMiddleware, meterController.removeElectricMeter);

// ลบมิเตอร์น้ำ
router.delete('/water/:roomId', authMiddleware, meterController.removeWaterMeter);

module.exports = router;
