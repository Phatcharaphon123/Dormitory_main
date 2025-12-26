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
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 อัตราสาธารณูปโภค ─────────────── */
// ดึงอัตราสาธารณูปโภค
router.get('/utilities/dormitories/:dormId/rates', authCheck, adminCheck, getUtilityRates);

// บันทึกอัตราสาธารณูปโภค
router.post('/utilities/dormitories/:dormId/rates', authCheck, adminCheck, upsertUtilityRates);

/* ─────────────── 📊 การวิเคราะห์สาธารณูปโภค ─────────────── */
// ดึงสรุปการใช้สาธารณูปโภค
router.get('/utilities/dormitories/:dormId/analytics/summary', authCheck, adminCheck, getUtilitySummary);

// ดึงข้อมูลสาธารณูปโภครายเดือน
router.get('/utilities/dormitories/:dormId/analytics/monthly', authCheck, adminCheck, getMonthlyUtilityData);

// ดึงข้อมูลสาธารณูปโภครายปี
router.get('/utilities/dormitories/:dormId/analytics/yearly', authCheck, adminCheck, getYearlyUtilityData);

// ดึงข้อมูลสาธารณูปโภครายวัน
router.get('/utilities/dormitories/:dormId/analytics/daily', authCheck, adminCheck, getDailyUtilityData);

module.exports = router;
