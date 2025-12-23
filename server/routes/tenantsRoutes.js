const express = require('express');
const router = express.Router();
const tenantsController = require('../controllers/tenantsController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 ผู้เช่า ─────────────── */
// ดึงข้อมูลผู้เช่าแบบเต็ม
router.get('/:tenantId/full', authMiddleware, tenantsController.getTenantFullById);
// แก้ไขข้อมูลผู้เช่า
router.put('/:tenantId', authMiddleware, tenantsController.updateTenant);

/* ─────────────── 📊 แดชบอร์ดผู้เช่า ─────────────── */
// ดึงสรุปข้อมูลผู้เช่า
router.get('/dormitories/:dormId/summary', authMiddleware, tenantsController.getTenantSummary);
// ดึงอัตราการเข้าพักรายเดือน
router.get('/dormitories/:dormId/occupancy', authMiddleware, tenantsController.getMonthlyOccupancy);
// ดึงประเภทห้อง
router.get('/dormitories/:dormId/room-types', authMiddleware, tenantsController.getRoomTypes);
// ดึงสถานะสัญญา
router.get('/dormitories/:dormId/contracts/status', authMiddleware, tenantsController.getContractStatus);

module.exports = router;


