const express = require('express');
const router = express.Router();
const {
  getDormMeters,
  addElectricMeter,
  addWaterMeter,
  removeElectricMeter,
  removeWaterMeter
} = require('../controllers/meterController');
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 จัดการมิเตอร์ ─────────────── */

// ดึงมิเตอร์ทั้งหมดตามหอพัก
router.get('/meters/meter-records/dormitories/:dormId', authCheck, adminCheck, getDormMeters);

// เพิ่มมิเตอร์ไฟฟ้า
router.post('/meters/meter-records/electric', authCheck, adminCheck, addElectricMeter);

// เพิ่มมิเตอร์น้ำ
router.post('/meters/meter-records/water', authCheck, adminCheck, addWaterMeter);

// ลบมิเตอร์ไฟฟ้า
router.delete('/meters/meter-records/electric/:roomId', authCheck, adminCheck, removeElectricMeter);

// ลบมิเตอร์น้ำ
router.delete('/meters/meter-records/water/:roomId', authCheck, adminCheck, removeWaterMeter);

module.exports = router;
