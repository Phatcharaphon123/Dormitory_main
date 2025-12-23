const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const authMiddleware = require('../middleware/authMiddleware');

/* ─────────────── 🔹 สัญญาและผู้เช่า ─────────────── */
// สร้างสัญญาใหม่
router.post('/dormitories/:dormId/rooms/:roomNumber', authMiddleware, contractController.createContract);

// ดึงสัญญาทั้งหมดตามหอพัก
router.get('/dormitories/:dormId', authMiddleware, contractController.getContractsByDorm);

// ดึงสัญญาตามห้อง
router.get('/dormitories/:dormId/rooms/:roomNumber', authMiddleware, contractController.getContractByRoom);

// ดึงรายละเอียดสัญญา
router.get('/:contractId', authMiddleware, contractController.getContractDetail);

// แก้ไขสัญญา
router.put('/:contractId', authMiddleware, contractController.updateContract);

/* ─────────────── 🔹 บริการในสัญญา ─────────────── */
// ดึงรายการบริการในสัญญา
router.get('/:contractId/services', authMiddleware, contractController.getContractServices);

// เพิ่มบริการในสัญญา
router.post('/:contractId/services', authMiddleware, contractController.addContractService);

// แก้ไขบริการในสัญญา
router.put('/:contractId/services/:serviceId', authMiddleware, contractController.updateContractService);

// ลบบริการในสัญญา
router.delete('/:contractId/services/:serviceId', authMiddleware, contractController.deleteContractService);

// ยุติสัญญา
router.post('/:contractId/terminate', authMiddleware, contractController.terminateContract);

// ดึงรายการผู้ขอย้ายออก
router.get('/dormitories/:dormId/moveout-list', authMiddleware, contractController.getMoveoutList);

// ยกเลิกการแจ้งย้ายออก
router.put('/:contractId/cancel-moveout', authMiddleware, contractController.cancelMoveoutNotice);

/* ─────────────── 🔹 สัญญาที่ยุติแล้ว ─────────────── */
// ดึงสัญญาที่ยุติแล้วตามหอพัก
router.get('/dormitories/:dormId/terminated', authMiddleware, contractController.getTerminatedContracts);

// ดึงรายละเอียดสัญญาที่ยุติแล้ว
router.get('/:contractId/terminated', authMiddleware, contractController.getTerminatedContractDetail);


module.exports = router;
