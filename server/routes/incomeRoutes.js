const express = require('express');
const router = express.Router();
const incomeController = require('../controllers/incomeController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 รายงานรายได้ ─────────────── */

// ดึงรายได้รายเดือน
router.get('/dormitories/:dormId/monthly', authMiddleware, incomeController.getMonthlyIncome);

// ดึงรายได้รายปี
router.get('/dormitories/:dormId/yearly', authMiddleware, incomeController.getYearlyIncome);

// ดึงสรุปรายได้
router.get('/dormitories/:dormId/summary', authMiddleware, incomeController.getIncomeSummary);

// ดึงการแยกประเภทรายได้
router.get('/dormitories/:dormId/breakdown', authMiddleware, incomeController.getIncomeBreakdown);

// ดึงค่าธรรมเนียมบริการ
router.get('/dormitories/:dormId/service-fees', authMiddleware, incomeController.getServiceFees);

// ดึงอัตราการเข้าพักรายเดือน
router.get('/dormitories/:dormId/occupancy', authMiddleware, incomeController.getMonthlyOccupancy);

module.exports = router;
