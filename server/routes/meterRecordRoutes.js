const express = require('express');
const router = express.Router();
const {
  getRoomsWithLatestMeter,
  createMeterRecord,
  getMeterRecords,
  getMeterRecordById,
  updateMeterRecordById,
  deleteMeterRecordById
} = require('../controllers/meterRecordController');
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 บันทึกมิเตอร์ ─────────────── */

// ดึงห้องพร้อมข้อมูลมิเตอร์ล่าสุด
router.get('/dormitories/:dormId/rooms-with-meter', authCheck, adminCheck, getRoomsWithLatestMeter);

// สร้างบันทึกมิเตอร์ใหม่
router.post('/dormitories/:dormId', authCheck, adminCheck, createMeterRecord);

// ดึงบันทึกมิเตอร์ทั้งหมด
router.get('/dormitories/:dormId/all', authCheck, adminCheck, getMeterRecords);

// ดึงบันทึกมิเตอร์ตาม ID
router.get('/dormitories/:dormId/:recordId', authCheck, adminCheck, getMeterRecordById);

// แก้ไขบันทึกมิเตอร์
router.put('/dormitories/:dormId/:recordId', authCheck, adminCheck, updateMeterRecordById);

// ลบบันทึกมิเตอร์
router.delete('/dormitories/:dormId/:recordId', authCheck, adminCheck, deleteMeterRecordById);

module.exports = router;