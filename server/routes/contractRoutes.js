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
const { authCheck,superAdminCheck,ownerCheck,staffCheck } = require('../middleware/authCheck');


/* ─────────────── 🔹 สัญญาและผู้เช่า ─────────────── */
// สร้างสัญญาใหม่
router.post('/contracts/dormitories/:dormId/rooms/:roomNumber', authCheck, staffCheck, createContract);

// ดึงสัญญาทั้งหมดตามหอพัก
router.get('/contracts/dormitories/:dormId', authCheck, staffCheck, getContractsByDorm);

// ดึงสัญญาตามห้อง
router.get('/contracts/dormitories/:dormId/rooms/:roomNumber', authCheck, staffCheck, getContractByRoom);

// ดึงรายละเอียดสัญญา
router.get('/contracts/:contractId', authCheck, staffCheck, getContractDetail);

// แก้ไขสัญญา
router.put('/contracts/:contractId', authCheck, staffCheck, updateContract);

/* ─────────────── 🔹 บริการในสัญญา ─────────────── */
// ดึงรายการบริการในสัญญา
router.get('/contracts/:contractId/services', authCheck, staffCheck, getContractServices);

// เพิ่มบริการในสัญญา
router.post('/contracts/:contractId/services', authCheck, staffCheck, addContractService);

// แก้ไขบริการในสัญญา
router.put('/contracts/:contractId/services/:serviceId', authCheck, staffCheck, updateContractService);

// ลบบริการในสัญญา
router.delete('/contracts/:contractId/services/:serviceId', authCheck, staffCheck, deleteContractService);

// ยุติสัญญา
router.post('/contracts/:contractId/terminate', authCheck, staffCheck, terminateContract);

// ดึงรายการผู้ขอย้ายออก
router.get('/contracts/dormitories/:dormId/moveout-list', authCheck, staffCheck, getMoveoutList);

// ยกเลิกการแจ้งย้ายออก
router.put('/contracts/:contractId/cancel-moveout', authCheck, staffCheck, cancelMoveoutNotice);

/* ─────────────── 🔹 สัญญาที่ยุติแล้ว ─────────────── */
// ดึงสัญญาที่ยุติแล้วตามหอพัก
router.get('/contracts/dormitories/:dormId/terminated', authCheck, staffCheck, getTerminatedContracts);

// ดึงรายละเอียดสัญญาที่ยุติแล้ว
router.get('/contracts/:contractId/terminated', authCheck, staffCheck, getTerminatedContractDetail);



module.exports = router;
