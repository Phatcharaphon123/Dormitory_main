const express = require('express');
const router = express.Router();
const {
  updateTenant,
  getTenantFullById,
  getTenantSummary,
  getMonthlyOccupancy,
  getRoomTypes,
  getContractStatus
} = require('../controllers/tenantsController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 ผู้เช่า ─────────────── */
// ดึงข้อมูลผู้เช่าแบบเต็ม
router.get('/:tenantId/full', authMiddleware, getTenantFullById);
// แก้ไขข้อมูลผู้เช่า
router.put('/:tenantId', authMiddleware, updateTenant);

/* ─────────────── 📊 แดชบอร์ดผู้เช่า ─────────────── */
// ดึงสรุปข้อมูลผู้เช่า
router.get('/dormitories/:dormId/summary', authMiddleware, getTenantSummary);
// ดึงอัตราการเข้าพักรายเดือน
router.get('/dormitories/:dormId/occupancy', authMiddleware, getMonthlyOccupancy);
// ดึงประเภทห้อง
router.get('/dormitories/:dormId/room-types', authMiddleware, getRoomTypes);
// ดึงสถานะสัญญา
router.get('/dormitories/:dormId/contracts/status', authMiddleware, getContractStatus);

module.exports = router;


