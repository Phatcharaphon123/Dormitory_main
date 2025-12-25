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
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 จัดการชั้น ─────────────── */
// ดึงชั้นทั้งหมดของหอพัก
router.get("/dormitories/:dormId/floors", authCheck, staffCheck, getDormFloors);
// แก้ไขชั้นของหอพัก
router.put("/dormitories/:dormId/floors", authCheck, staffCheck, updateDormFloors);

/* ─────────────── 🔹 จัดการห้อง ─────────────── */
// ดึงห้องทั้งหมดของหอพัก
router.get("/dormitories/:dormId", authCheck, staffCheck, getDormRooms);
// ดึงห้องแยกตามชั้น
router.get("/dormitories/:dormId/by-floor", authCheck, staffCheck, getDormRoomsByFloor);
// ดึงรายละเอียดห้อง
router.get("/dormitories/:dormId/rooms/:roomId/detail", authCheck, staffCheck, getRoomDetail);
// ตรวจสอบข้อมูลห้อง
router.get("/dormitories/:dormId/check-data", authCheck, staffCheck, checkRoomsData);
// แก้ไขห้องทั้งหมดของหอพัก
router.put("/dormitories/:dormId", authCheck, staffCheck, updateDormRooms);
// แก้ไขห้องเดี่ยว
router.put("/:roomId", authCheck, staffCheck, updateSingleRoom);
// ลบหลายห้องพร้อมกัน
router.delete("/multiple", authCheck, staffCheck, deleteMultipleRooms);
// แก้ไขห้องที่เลือกแบบกลุ่ม
router.put("/dormitories/:dormId/selected", authCheck, staffCheck, bulkUpdateRooms);

module.exports = router;
