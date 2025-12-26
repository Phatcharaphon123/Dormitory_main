const express = require('express');
const router = express.Router();
const {
  getAllRoomTypes,
  getRoomTypeById,
  createRoomType,
  updateRoomType,
  deleteRoomType
} = require('../controllers/roomTypeController');
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');
const multer = require('multer');
const path = require('path');

// ─────────────── Upload config ───────────────
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueName);
  }
});
const upload = multer({ storage });

/* ─────────────── 🔹 ประเภทห้อง ─────────────── */
// ดึงประเภทห้องตาม ID
router.get("/room-types/:id", authCheck, staffCheck, getRoomTypeById);

// ดึงประเภทห้องทั้งหมดตามหอพัก
router.get("/room-types/dormitories/:dormId", authCheck, staffCheck, getAllRoomTypes);

// ดึงประเภทห้องตาม ID และหอพัก
router.get("/room-types/dormitories/:dormId/:id", authCheck, staffCheck, getRoomTypeById);

// สร้างประเภทห้องใหม่
router.post("/room-types/dormitories/:dormId", authCheck, staffCheck, upload.array('images', 10), createRoomType);

// แก้ไขประเภทห้อง
router.put("/room-types/dormitories/:dormId/:id", authCheck, staffCheck, upload.array('images', 10), updateRoomType);

// ลบประเภทห้อง
router.delete("/room-types/dormitories/:dormId/:id", authCheck, staffCheck, deleteRoomType);

module.exports = router;
