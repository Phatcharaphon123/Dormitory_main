const express = require('express');
const router = express.Router();
const roomTypeController = require('../controllers/roomTypeController');
const authMiddleware = require('../middleware/authMiddleware');
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
router.get("/:id", authMiddleware, roomTypeController.getRoomTypeById);
// ดึงประเภทห้องทั้งหมดตามหอพัก
router.get("/dormitories/:dormId", authMiddleware, roomTypeController.getAllRoomTypes);
// ดึงประเภทห้องตาม ID และหอพัก
router.get("/dormitories/:dormId/:id", authMiddleware, roomTypeController.getRoomTypeById);
// สร้างประเภทห้องใหม่
router.post("/dormitories/:dormId", authMiddleware, upload.array('images', 10), roomTypeController.createRoomType);
// แก้ไขประเภทห้อง
router.put("/dormitories/:dormId/:id", authMiddleware, upload.array('images', 10), roomTypeController.updateRoomType);
// ลบประเภทห้อง
router.delete("/dormitories/:dormId/:id", authMiddleware, roomTypeController.deleteRoomType);

module.exports = router;
