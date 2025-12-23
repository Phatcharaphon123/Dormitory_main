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
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 รายงานรายได้ ─────────────── */

// ดึงรายได้รายเดือน
router.get('/dormitories/:dormId/monthly', authMiddleware, getMonthlyIncome);

// ดึงรายได้รายปี
router.get('/dormitories/:dormId/yearly', authMiddleware, getYearlyIncome);

// ดึงสรุปรายได้
router.get('/dormitories/:dormId/summary', authMiddleware, getIncomeSummary);

// ดึงการแยกประเภทรายได้
router.get('/dormitories/:dormId/breakdown', authMiddleware, getIncomeBreakdown);

// ดึงค่าธรรมเนียมบริการ
router.get('/dormitories/:dormId/service-fees', authMiddleware, getServiceFees);

// ดึงอัตราการเข้าพักรายเดือน
router.get('/dormitories/:dormId/occupancy', authMiddleware, getMonthlyOccupancy);

module.exports = router;
