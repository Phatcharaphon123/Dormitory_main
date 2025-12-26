const express = require('express'); // เรียกใช้ express
const router = express.Router(); // สร้าง router ใหม่
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');
const {
    DormitoryLatest,
    Dormitory
} = require('../controllers/senserDormitory'); // เรียกใช้ controller

/* ─────────────── 🔹 เซ็นเซอร์หอพัก ─────────────── */

// ดึงข้อมูลเซ็นเซอร์ทั้งหมด
router.get('/sensor-dormitory/sensor', authCheck, adminCheck, Dormitory);

// ดึงข้อมูลเซ็นเซอร์ล่าสุด
router.get('/sensor-dormitory/sensor/latest', authCheck, adminCheck, DormitoryLatest);

module.exports = router; 