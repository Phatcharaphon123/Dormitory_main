const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 จัดการชั้น ─────────────── */
// ดึงชั้นทั้งหมดของหอพัก
router.get("/dormitories/:dormId/floors", authMiddleware, roomController.getDormFloors);
// แก้ไขชั้นของหอพัก
router.put("/dormitories/:dormId/floors", authMiddleware, roomController.updateDormFloors);

/* ─────────────── 🔹 จัดการห้อง ─────────────── */
// ดึงห้องทั้งหมดของหอพัก
router.get("/dormitories/:dormId", authMiddleware, roomController.getDormRooms);
// ดึงห้องแยกตามชั้น
router.get("/dormitories/:dormId/by-floor", authMiddleware, roomController.getDormRoomsByFloor);
// ดึงรายละเอียดห้อง
router.get("/dormitories/:dormId/rooms/:roomId/detail", authMiddleware, roomController.getRoomDetail);
// ตรวจสอบข้อมูลห้อง
router.get("/dormitories/:dormId/check-data", authMiddleware, roomController.checkRoomsData);
// แก้ไขห้องทั้งหมดของหอพัก
router.put("/dormitories/:dormId", authMiddleware, roomController.updateDormRooms);
// แก้ไขห้องเดี่ยว
router.put("/:roomId", authMiddleware, roomController.updateSingleRoom);
// ลบหลายห้องพร้อมกัน
router.delete("/multiple", authMiddleware, roomController.deleteMultipleRooms);
// แก้ไขห้องที่เลือกแบบกลุ่ม
router.put("/dormitories/:dormId/selected", authMiddleware, roomController.bulkUpdateRooms);

module.exports = router;
