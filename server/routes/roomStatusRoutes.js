const express = require('express');
const router = express.Router();
const {
  updateRoomAvailability,
  fixRoomStatus
} = require('../controllers/roomStatusController');
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 สถานะห้อง ─────────────── */

// อัปเดตสถานะการว่างของห้องทั้งหมด
router.put('/:dormId/update-all', authCheck, staffCheck, updateRoomAvailability);

// แก้ไขสถานะห้องเฉพาะห้อง
router.put('/:dormId/rooms/:roomNumber/fix', authCheck, staffCheck, fixRoomStatus);

module.exports = router;
