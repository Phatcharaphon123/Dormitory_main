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
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 สัญญาและผู้เช่า ─────────────── */
// สร้างสัญญาใหม่
router.post('/dormitories/:dormId/rooms/:roomNumber', authMiddleware, createContract);

// ดึงสัญญาทั้งหมดตามหอพัก
router.get('/dormitories/:dormId', authMiddleware, getContractsByDorm);

// ดึงสัญญาตามห้อง
router.get('/dormitories/:dormId/rooms/:roomNumber', authMiddleware, getContractByRoom);

// ดึงรายละเอียดสัญญา
router.get('/:contractId', authMiddleware, getContractDetail);

// แก้ไขสัญญา
router.put('/:contractId', authMiddleware, updateContract);

/* ─────────────── 🔹 บริการในสัญญา ─────────────── */
// ดึงรายการบริการในสัญญา
router.get('/:contractId/services', authMiddleware, getContractServices);
// เพิ่มบริการในสัญญา
router.post('/:contractId/services', authMiddleware, addContractService);

// แก้ไขบริการในสัญญา
router.put('/:contractId/services/:serviceId', authMiddleware, updateContractService);

// ลบบริการในสัญญา
router.delete('/:contractId/services/:serviceId', authMiddleware, deleteContractService);

// ยุติสัญญา
router.post('/:contractId/terminate', authMiddleware, terminateContract);

// ดึงรายการผู้ขอย้ายออก
router.get('/dormitories/:dormId/moveout-list', authMiddleware, getMoveoutList);

// ยกเลิกการแจ้งย้ายออก
router.put('/:contractId/cancel-moveout', authMiddleware, cancelMoveoutNotice);

/* ─────────────── 🔹 สัญญาที่ยุติแล้ว ─────────────── */
// ดึงสัญญาที่ยุติแล้วตามหอพัก
router.get('/dormitories/:dormId/terminated', authMiddleware, getTerminatedContracts);
// ดึงรายละเอียดสัญญาที่ยุติแล้ว
router.get('/:contractId/terminated', authMiddleware, getTerminatedContractDetail);


module.exports = router;
