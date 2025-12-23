const express = require('express');
const router = express.Router();
const dormitoryController = require('../controllers/dormitoryController');
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

/* ─────────────── 🔹 จัดการหอพัก ─────────────── */
// ดึงข้อมูลหอพักพร้อมสถิติ (ต้องมาก่อน /:id)
router.get("/with-stats", authMiddleware, dormitoryController.getAllDormsWithStats);

// ดึงหอพักทั้งหมด
router.get("/", authMiddleware, dormitoryController.getAllDorms); 

// เพิ่มหอพักใหม่
router.post("/", authMiddleware, upload.single("image"), dormitoryController.createDorm);

// ดึงข้อมูลหอพักรายตัว
router.get("/:id", authMiddleware, dormitoryController.getDormById);

// แก้ไขข้อมูลหอพัก
router.put("/:id", authMiddleware, upload.fields([{ name: "image", maxCount: 1 }]), dormitoryController.updateDorm);

module.exports = router;
