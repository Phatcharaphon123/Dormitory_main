const express = require('express');
const router = express.Router();
const {
  getDormMeters,
  addElectricMeter,
  addWaterMeter,
  removeElectricMeter,
  removeWaterMeter
} = require('../controllers/meterController');
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 จัดการมิเตอร์ ─────────────── */

// ดึงมิเตอร์ทั้งหมดตามหอพัก
router.get('/dormitories/:dormId', authCheck, staffCheck, getDormMeters);

// เพิ่มมิเตอร์ไฟฟ้า
router.post('/electric', authCheck, staffCheck, addElectricMeter);

// เพิ่มมิเตอร์น้ำ
router.post('/water', authCheck, staffCheck, addWaterMeter);

// ลบมิเตอร์ไฟฟ้า
router.delete('/electric/:roomId', authCheck, staffCheck, removeElectricMeter);

// ลบมิเตอร์น้ำ
router.delete('/water/:roomId', authCheck, staffCheck, removeWaterMeter);

module.exports = router;
