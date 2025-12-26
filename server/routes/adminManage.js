const express = require('express');
const router = express.Router();

const { getAdmin, createAdmin, updateAdmin, deleteAdmin } = require('../controllers/adminManage');
const { authCheck, ownerCheck } = require('../middleware/authCheck');

// เพิ่ม authCheck สำหรับทุก endpoint เพื่อความปลอดภัย
router.get('/admin', authCheck,ownerCheck, getAdmin);
router.post('/admin', authCheck, ownerCheck, createAdmin);
router.put('/admin/:id', authCheck, ownerCheck, updateAdmin);
router.delete('/admin/:id', authCheck, ownerCheck, deleteAdmin);

module.exports = router;