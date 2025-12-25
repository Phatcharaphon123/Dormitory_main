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
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');

/* ─────────────── 🔹 อัตราสาธารณูปโภค ─────────────── */
// ดึงอัตราสาธารณูปโภค
router.get('/dormitories/:dormId/rates', authCheck, staffCheck, getUtilityRates);

// บันทึกอัตราสาธารณูปโภค
router.post('/dormitories/:dormId/rates', authCheck, staffCheck, upsertUtilityRates);

/* ─────────────── 📊 การวิเคราะห์สาธารณูปโภค ─────────────── */
// ดึงสรุปการใช้สาธารณูปโภค
router.get('/dormitories/:dormId/analytics/summary', authCheck, staffCheck, getUtilitySummary);
// ดึงข้อมูลสาธารณูปโภครายเดือน
router.get('/dormitories/:dormId/analytics/monthly', authCheck, staffCheck, getMonthlyUtilityData);

// ดึงข้อมูลสาธารณูปโภครายปี
router.get('/dormitories/:dormId/analytics/yearly', authCheck, staffCheck, getYearlyUtilityData);

// ดึงข้อมูลสาธารณูปโภครายวัน
router.get('/dormitories/:dormId/analytics/daily', authCheck, staffCheck, getDailyUtilityData);

module.exports = router;
