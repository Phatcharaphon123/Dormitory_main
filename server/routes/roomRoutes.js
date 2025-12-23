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
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 จัดการชั้น ─────────────── */
// ดึงชั้นทั้งหมดของหอพัก
router.get("/dormitories/:dormId/floors", authMiddleware, getDormFloors);
// แก้ไขชั้นของหอพัก
router.put("/dormitories/:dormId/floors", authMiddleware, updateDormFloors);

/* ─────────────── 🔹 จัดการห้อง ─────────────── */
// ดึงห้องทั้งหมดของหอพัก
router.get("/dormitories/:dormId", authMiddleware, getDormRooms);
// ดึงห้องแยกตามชั้น
router.get("/dormitories/:dormId/by-floor", authMiddleware, getDormRoomsByFloor);
// ดึงรายละเอียดห้อง
router.get("/dormitories/:dormId/rooms/:roomId/detail", authMiddleware, getRoomDetail);
// ตรวจสอบข้อมูลห้อง
router.get("/dormitories/:dormId/check-data", authMiddleware, checkRoomsData);
// แก้ไขห้องทั้งหมดของหอพัก
router.put("/dormitories/:dormId", authMiddleware, updateDormRooms);
// แก้ไขห้องเดี่ยว
router.put("/:roomId", authMiddleware, updateSingleRoom);
// ลบหลายห้องพร้อมกัน
router.delete("/multiple", authMiddleware, deleteMultipleRooms);
// แก้ไขห้องที่เลือกแบบกลุ่ม
router.put("/dormitories/:dormId/selected", authMiddleware, bulkUpdateRooms);

module.exports = router;
