const express = require('express');
const router = express.Router();
const {
  createDorm,
  getAllDorms,
  getAllDormsWithStats,
  getDormById,
  updateDorm
} = require('../controllers/dormitoryController');
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

/* ─────────────── 🔹 จัดการหอพัก ─────────────── */
// ดึงข้อมูลหอพักพร้อมสถิติ (ต้องมาก่อน /:id)
router.get("/dormitories/with-stats", authCheck, staffCheck, getAllDormsWithStats);

// ดึงหอพักทั้งหมด
router.get("/dormitories", authCheck, staffCheck, getAllDorms); 

// เพิ่มหอพักใหม่
router.post("/dormitories", authCheck, staffCheck, upload.single("image"), createDorm);

// ดึงข้อมูลหอพักรายตัว
router.get("/dormitories/:id", authCheck, staffCheck, getDormById);

// แก้ไขข้อมูลหอพัก
router.put("/dormitories/:id", authCheck, staffCheck, upload.fields([{ name: "image", maxCount: 1 }]), updateDorm);

module.exports = router;
