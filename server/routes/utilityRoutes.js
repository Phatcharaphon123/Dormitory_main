const express = require('express');
const router = express.Router();
const {
  upsertUtilityRates,
  getUtilityRates,
  getUtilitySummary,
  getMonthlyUtilityData,
  getYearlyUtilityData,
  getDailyUtilityData
} = require('../controllers/utilityController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 อัตราสาธารณูปโภค ─────────────── */
// ดึงอัตราสาธารณูปโภค
router.get('/dormitories/:dormId/rates', authMiddleware, getUtilityRates);

// บันทึกอัตราสาธารณูปโภค
router.post('/dormitories/:dormId/rates', authMiddleware, upsertUtilityRates);

/* ─────────────── 📊 การวิเคราะห์สาธารณูปโภค ─────────────── */
// ดึงสรุปการใช้สาธารณูปโภค
router.get('/dormitories/:dormId/analytics/summary', authMiddleware, getUtilitySummary);
// ดึงข้อมูลสาธารณูปโภครายเดือน
router.get('/dormitories/:dormId/analytics/monthly', authMiddleware, getMonthlyUtilityData);

// ดึงข้อมูลสาธารณูปโภครายปี
router.get('/dormitories/:dormId/analytics/yearly', authMiddleware, getYearlyUtilityData);

// ดึงข้อมูลสาธารณูปโภครายวัน
router.get('/dormitories/:dormId/analytics/daily', authMiddleware, getDailyUtilityData);

module.exports = router;
