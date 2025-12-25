const express = require('express');
const router = express.Router();
const {  register,login,verifyToken,updateProfile,changePassword,resetPasswordWithToken } = require('../controllers/userController');
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');

// สมัครสมาชิก
router.post('/register', register);
// เข้าสู่ระบบ
router.post('/login', login);

// ตรวจสอบสถานะการเข้าสู่ระบบ
router.get('/verify', verifyToken);

// อัปเดตข้อมูลโปรไฟล์
router.put('/profile', authCheck, updateProfile);

// เปลี่ยนรหัสผ่าน
router.put('/change-password', authCheck, changePassword);

// รีเซ็ตรหัสผ่านด้วย Token
router.put('/reset-password', authCheck, resetPasswordWithToken);

module.exports = router;
