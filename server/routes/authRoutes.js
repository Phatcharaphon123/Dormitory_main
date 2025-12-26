const express = require('express');
const router = express.Router();
const {  register,login,verifyToken,updateProfile,changePassword,resetPasswordWithToken } = require('../controllers/userController');
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');

// สมัครสมาชิก
router.post('/auth/register', register);
// เข้าสู่ระบบ
router.post('/auth/login', login);

// ตรวจสอบสถานะการเข้าสู่ระบบ
router.get('/auth/verify', verifyToken);

// อัปเดตข้อมูลโปรไฟล์
router.put('/auth/profile', authCheck, updateProfile);

// เปลี่ยนรหัสผ่าน
router.put('/auth/change-password', authCheck, changePassword);

// รีเซ็ตรหัสผ่านด้วย Token
router.put('/auth/reset-password', authCheck, resetPasswordWithToken);

module.exports = router;
