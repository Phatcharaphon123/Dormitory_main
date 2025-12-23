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
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 บันทึกมิเตอร์ ─────────────── */

// ดึงห้องพร้อมข้อมูลมิเตอร์ล่าสุด
router.get('/dormitories/:dormId/rooms-with-meter', authMiddleware, getRoomsWithLatestMeter);

// สร้างบันทึกมิเตอร์ใหม่
router.post('/dormitories/:dormId', authMiddleware, createMeterRecord);

// ดึงบันทึกมิเตอร์ทั้งหมด
router.get('/dormitories/:dormId/all', authMiddleware, getMeterRecords);

// ดึงบันทึกมิเตอร์ตาม ID
router.get('/dormitories/:dormId/:recordId', authMiddleware, getMeterRecordById);

// แก้ไขบันทึกมิเตอร์
router.put('/dormitories/:dormId/:recordId', authMiddleware, updateMeterRecordById);

// ลบบันทึกมิเตอร์
router.delete('/dormitories/:dormId/:recordId', authMiddleware, deleteMeterRecordById);

module.exports = router;