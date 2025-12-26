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
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 รายงานรายได้ ─────────────── */

// ดึงรายได้รายเดือน
router.get('/income/dormitories/:dormId/monthly', authCheck, adminCheck, getMonthlyIncome);

// ดึงรายได้รายปี
router.get('/income/dormitories/:dormId/yearly', authCheck, adminCheck, getYearlyIncome);

// ดึงสรุปรายได้
router.get('/income/dormitories/:dormId/summary', authCheck, adminCheck, getIncomeSummary);

// ดึงการแยกประเภทรายได้
router.get('/income/dormitories/:dormId/breakdown', authCheck, adminCheck, getIncomeBreakdown);

// ดึงค่าธรรมเนียมบริการ
router.get('/income/dormitories/:dormId/service-fees', authCheck, adminCheck, getServiceFees);

// ดึงอัตราการเข้าพักรายเดือน
router.get('/income/dormitories/:dormId/occupancy', authCheck, adminCheck, getMonthlyOccupancy);

module.exports = router;
