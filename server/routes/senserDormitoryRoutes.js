const express = require('express'); // เรียกใช้ express
const router = express.Router(); // สร้าง router ใหม่

const senserDormitoryController = require('../controllers/senserDormitory'); // เรียกใช้ controller

/* ─────────────── 🔹 เซ็นเซอร์หอพัก ─────────────── */

// ดึงข้อมูลเซ็นเซอร์ทั้งหมด
router.get('/sensor', senserDormitoryController.Dormitory);

// ดึงข้อมูลเซ็นเซอร์ล่าสุด
router.get('/sensor/latest', senserDormitoryController.DormitoryLatest);

module.exports = router; 