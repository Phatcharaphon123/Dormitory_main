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
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 ผู้เช่า ─────────────── */
// ดึงข้อมูลผู้เช่าแบบเต็ม
router.get('/:tenantId/full', authCheck, staffCheck, getTenantFullById);
// แก้ไขข้อมูลผู้เช่า
router.put('/:tenantId', authCheck, staffCheck, updateTenant);

/* ─────────────── 📊 แดชบอร์ดผู้เช่า ─────────────── */
// ดึงสรุปข้อมูลผู้เช่า
router.get('/dormitories/:dormId/summary', authCheck, staffCheck, getTenantSummary);
// ดึงอัตราการเข้าพักรายเดือน
router.get('/dormitories/:dormId/occupancy', authCheck, staffCheck, getMonthlyOccupancy);
// ดึงประเภทห้อง
router.get('/dormitories/:dormId/room-types', authCheck, staffCheck, getRoomTypes);
// ดึงสถานะสัญญา
router.get('/dormitories/:dormId/contracts/status', authCheck, staffCheck, getContractStatus);

module.exports = router;


