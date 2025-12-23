const express = require('express');
const router = express.Router();
const {
  updateRoomAvailability,
  fixRoomStatus
} = require('../controllers/roomStatusController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 สถานะห้อง ─────────────── */

// อัปเดตสถานะการว่างของห้องทั้งหมด
router.put('/:dormId/update-all', authMiddleware, updateRoomAvailability);

// แก้ไขสถานะห้องเฉพาะห้อง
router.put('/:dormId/rooms/:roomNumber/fix', authMiddleware, fixRoomStatus);

module.exports = router;
