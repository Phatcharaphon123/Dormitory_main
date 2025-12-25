const express = require('express');
const router = express.Router();
const {
  getMonthlyIncome,
  getYearlyIncome,
  getIncomeSummary,
  getIncomeBreakdown,
  getServiceFees,
  getMonthlyOccupancy
} = require('../controllers/incomeController');
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 รายงานรายได้ ─────────────── */

// ดึงรายได้รายเดือน
router.get('/dormitories/:dormId/monthly', authCheck, staffCheck, getMonthlyIncome);

// ดึงรายได้รายปี
router.get('/dormitories/:dormId/yearly', authCheck, staffCheck, getYearlyIncome);

// ดึงสรุปรายได้
router.get('/dormitories/:dormId/summary', authCheck, staffCheck, getIncomeSummary);

// ดึงการแยกประเภทรายได้
router.get('/dormitories/:dormId/breakdown', authCheck, staffCheck, getIncomeBreakdown);

// ดึงค่าธรรมเนียมบริการ
router.get('/dormitories/:dormId/service-fees', authCheck, staffCheck, getServiceFees);

// ดึงอัตราการเข้าพักรายเดือน
router.get('/dormitories/:dormId/occupancy', authCheck, staffCheck, getMonthlyOccupancy);

module.exports = router;
