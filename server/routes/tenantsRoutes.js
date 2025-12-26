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
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 ผู้เช่า ─────────────── */
// ดึงข้อมูลผู้เช่าแบบเต็ม
router.get('/tenants/:tenantId/full', authCheck, adminCheck, getTenantFullById);

// แก้ไขข้อมูลผู้เช่า
router.put('/tenants/:tenantId', authCheck, adminCheck, updateTenant);

/* ─────────────── 📊 แดชบอร์ดผู้เช่า ─────────────── */
// ดึงสรุปข้อมูลผู้เช่า
router.get('/tenants/dormitories/:dormId/summary', authCheck, adminCheck, getTenantSummary);

// ดึงอัตราการเข้าพักรายเดือน
router.get('/dormitories/:dormId/occupancy', authCheck, adminCheck, getMonthlyOccupancy);

// ดึงประเภทห้อง
router.get('/tenants/dormitories/:dormId/room-types', authCheck, adminCheck, getRoomTypes);

// ดึงสถานะสัญญา
router.get('/tenants/dormitories/:dormId/contracts/status', authCheck, adminCheck, getContractStatus);

module.exports = router;


