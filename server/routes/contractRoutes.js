const express = require('express');
const router = express.Router();
const {
  createContract,
  getContractsByDorm,
  getContractDetail,
  getContractByRoom,
  updateContract,
  terminateContract,
  getMoveoutList,
  cancelMoveoutNotice,
  getContractServices,
  addContractService,
  updateContractService,
  deleteContractService,
  getTerminatedContracts,
  getTerminatedContractDetail
} = require('../controllers/contractController');
const { authCheck,superAdminCheck,ownerCheck,adminCheck } = require('../middleware/authCheck');


/* ─────────────── 🔹 สัญญาและผู้เช่า ─────────────── */
// สร้างสัญญาใหม่
router.post('/contracts/dormitories/:dormId/rooms/:roomNumber', authCheck, adminCheck, createContract);

// ดึงสัญญาทั้งหมดตามหอพัก
router.get('/contracts/dormitories/:dormId', authCheck, adminCheck, getContractsByDorm);

// ดึงสัญญาตามห้อง
router.get('/contracts/dormitories/:dormId/rooms/:roomNumber', authCheck, adminCheck, getContractByRoom);

// ดึงรายละเอียดสัญญา
router.get('/contracts/:contractId', authCheck, adminCheck, getContractDetail);

// แก้ไขสัญญา
router.put('/contracts/:contractId', authCheck, adminCheck, updateContract);

/* ─────────────── 🔹 บริการในสัญญา ─────────────── */
// ดึงรายการบริการในสัญญา
router.get('/contracts/:contractId/services', authCheck, adminCheck, getContractServices);

// เพิ่มบริการในสัญญา
router.post('/contracts/:contractId/services', authCheck, adminCheck, addContractService);

// แก้ไขบริการในสัญญา
router.put('/contracts/:contractId/services/:serviceId', authCheck, adminCheck, updateContractService);

// ลบบริการในสัญญา
router.delete('/contracts/:contractId/services/:serviceId', authCheck, adminCheck, deleteContractService);

// ยุติสัญญา
router.post('/contracts/:contractId/terminate', authCheck, adminCheck, terminateContract);

// ดึงรายการผู้ขอย้ายออก
router.get('/contracts/dormitories/:dormId/moveout-list', authCheck, adminCheck, getMoveoutList);

// ยกเลิกการแจ้งย้ายออก
router.put('/contracts/:contractId/cancel-moveout', authCheck, adminCheck, cancelMoveoutNotice);

/* ─────────────── 🔹 สัญญาที่ยุติแล้ว ─────────────── */
// ดึงสัญญาที่ยุติแล้วตามหอพัก
router.get('/contracts/dormitories/:dormId/terminated', authCheck, adminCheck, getTerminatedContracts);

// ดึงรายละเอียดสัญญาที่ยุติแล้ว
router.get('/contracts/:contractId/terminated', authCheck, adminCheck, getTerminatedContractDetail);



module.exports = router;
