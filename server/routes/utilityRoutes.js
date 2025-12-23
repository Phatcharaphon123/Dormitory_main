const express = require('express');
const router = express.Router();
const utilityController = require('../controllers/utilityController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 อัตราสาธารณูปโภค ─────────────── */
// ดึงอัตราสาธารณูปโภค
router.get('/dormitories/:dormId/rates', authMiddleware, utilityController.getUtilityRates);

// บันทึกอัตราสาธารณูปโภค
router.post('/dormitories/:dormId/rates', authMiddleware, utilityController.upsertUtilityRates);

/* ─────────────── 📊 การวิเคราะห์สาธารณูปโภค ─────────────── */
// ดึงสรุปการใช้สาธารณูปโภค
router.get('/dormitories/:dormId/analytics/summary', authMiddleware, utilityController.getUtilitySummary);

// ดึงข้อมูลสาธารณูปโภครายเดือน
router.get('/dormitories/:dormId/analytics/monthly', authMiddleware, utilityController.getMonthlyUtilityData);

// ดึงข้อมูลสาธารณูปโภครายปี
router.get('/dormitories/:dormId/analytics/yearly', authMiddleware, utilityController.getYearlyUtilityData);

// ดึงข้อมูลสาธารณูปโภครายวัน
router.get('/dormitories/:dormId/analytics/daily', authMiddleware, utilityController.getDailyUtilityData);

module.exports = router;
