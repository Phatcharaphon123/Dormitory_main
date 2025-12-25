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
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 บันทึกมิเตอร์ ─────────────── */

// ดึงห้องพร้อมข้อมูลมิเตอร์ล่าสุด
router.get('/dormitories/:dormId/rooms-with-meter', authCheck, staffCheck, getRoomsWithLatestMeter);

// สร้างบันทึกมิเตอร์ใหม่
router.post('/dormitories/:dormId', authCheck, staffCheck, createMeterRecord);

// ดึงบันทึกมิเตอร์ทั้งหมด
router.get('/dormitories/:dormId/all', authCheck, staffCheck, getMeterRecords);

// ดึงบันทึกมิเตอร์ตาม ID
router.get('/dormitories/:dormId/:recordId', authCheck, staffCheck, getMeterRecordById);

// แก้ไขบันทึกมิเตอร์
router.put('/dormitories/:dormId/:recordId', authCheck, staffCheck, updateMeterRecordById);

// ลบบันทึกมิเตอร์
router.delete('/dormitories/:dormId/:recordId', authCheck, staffCheck, deleteMeterRecordById);

module.exports = router;