const express = require('express');
const router = express.Router();
const {
  getDormFloors,
  updateDormFloors,
  getDormRooms,
  getDormRoomsByFloor,
  getRoomDetail,
  checkRoomsData,
  updateDormRooms,
  updateSingleRoom,
  bulkUpdateRooms,
  deleteMultipleRooms
} = require('../controllers/roomController');
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 จัดการชั้น ─────────────── */
// ดึงชั้นทั้งหมดของหอพัก
router.get("/rooms/dormitories/:dormId/floors", authCheck, adminCheck, getDormFloors);

// แก้ไขชั้นของหอพัก
router.put("/rooms/dormitories/:dormId/floors", authCheck, adminCheck, updateDormFloors);

/* ─────────────── 🔹 จัดการห้อง ─────────────── */
// ดึงห้องทั้งหมดของหอพัก
router.get("/rooms/dormitories/:dormId", authCheck, adminCheck, getDormRooms);

// ดึงห้องแยกตามชั้น
router.get("/rooms/dormitories/:dormId/by-floor", authCheck, adminCheck, getDormRoomsByFloor);

// ดึงรายละเอียดห้อง
router.get("/rooms/dormitories/:dormId/rooms/:roomId/detail", authCheck, adminCheck, getRoomDetail);

// ตรวจสอบข้อมูลห้อง
router.get("/rooms/dormitories/:dormId/check-data", authCheck, adminCheck, checkRoomsData);

// แก้ไขห้องทั้งหมดของหอพัก
router.put("/rooms/dormitories/:dormId", authCheck, adminCheck, updateDormRooms);

// แก้ไขห้องเดี่ยว
router.put("/rooms/:roomId", authCheck, adminCheck, updateSingleRoom);

// ลบหลายห้องพร้อมกัน
router.delete("/rooms/multiple", authCheck, adminCheck, deleteMultipleRooms);

// แก้ไขห้องที่เลือกแบบกลุ่ม
router.put("/rooms/dormitories/:dormId/selected", authCheck, adminCheck, bulkUpdateRooms);

module.exports = router;
