const express = require('express');
const router = express.Router();
const {
  createDorm,
  getAllDorms,
  getAllDormsWithStats,
  getDormById,
  updateDorm
} = require('../controllers/dormitoryController');
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');
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
router.get("/dormitories/with-stats", authCheck, adminCheck, getAllDormsWithStats);

// ดึงหอพักทั้งหมด (สำหรับ authenticated users)
router.get("/dormitories", authCheck, adminCheck, getAllDorms); 

// ดึงหอพักทั้งหมด (สำหรับ dropdown - ต้องมี auth)
router.get("/dorms", authCheck, getAllDorms);

// เพิ่มหอพักใหม่
router.post("/dormitories", authCheck, adminCheck, upload.single("image"), createDorm);

// ดึงข้อมูลหอพักรายตัว
router.get("/dormitories/:id", authCheck, adminCheck, getDormById);

// แก้ไขข้อมูลหอพัก
router.put("/dormitories/:id", authCheck, adminCheck, upload.fields([{ name: "image", maxCount: 1 }]), updateDorm);

module.exports = router;
