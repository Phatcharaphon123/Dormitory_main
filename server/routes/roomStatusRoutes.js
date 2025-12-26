const express = require('express');
const router = express.Router();
const {
  updateRoomAvailability,
  fixRoomStatus
} = require('../controllers/roomStatusController');
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 สถานะห้อง ─────────────── */

// อัปเดตสถานะการว่างของห้องทั้งหมด
router.put('/room-status/:dormId/update-all', authCheck, adminCheck, updateRoomAvailability);

// แก้ไขสถานะห้องเฉพาะห้อง
router.put('/room-status/:dormId/rooms/:roomNumber/fix', authCheck, adminCheck, fixRoomStatus);

module.exports = router;
