const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// สมัครสมาชิก
router.post('/register', userController.register);

// เข้าสู่ระบบ
router.post('/login', userController.login);

// ตรวจสอบสถานะการเข้าสู่ระบบ
router.get('/verify', userController.verifyToken);

// อัปเดตข้อมูลโปรไฟล์
router.put('/profile', authMiddleware, userController.updateProfile);

// เปลี่ยนรหัสผ่าน
router.put('/change-password', authMiddleware, userController.changePassword);

// รีเซ็ตรหัสผ่านด้วย Token
router.put('/reset-password', authMiddleware, userController.resetPasswordWithToken);

module.exports = router;
