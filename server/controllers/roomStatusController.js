const pool = require('../db');

/**
 * อัปเดตสถานะห้องให้เป็นว่าง เมื่อไม่มีสัญญาที่ active
 */
exports.updateRoomAvailability = async (req, res) => {
  try {
    // อัปเดตสถานะห้องทั้งหมดในหอพักให้ตรงกับสถานะสัญญา
    const { dormId } = req.params;
    
    const updateQuery = `
      UPDATE rooms 
      SET available = CASE 
        WHEN EXISTS (
          SELECT 1 FROM contracts c 
          WHERE c.room_id = rooms.room_id 
          AND c.status = 'active'
        ) THEN false
        ELSE true
      END,
      updated_at = CURRENT_TIMESTAMP
      WHERE dorm_id = $1
      RETURNING room_id, room_number, available
    `;

    const result = await pool.query(updateQuery, [dormId]);
    
    console.log(`✅ อัปเดตสถานะห้อง ${result.rows.length} ห้อง`);
    
    // นับจำนวนห้องที่เปลี่ยนสถานะ
    const availableRooms = result.rows.filter(room => room.available).length;
    const unavailableRooms = result.rows.filter(room => !room.available).length;
    
    res.json({
      success: true,
      message: 'อัปเดตสถานะห้องสำเร็จ',
      data: {
        totalUpdated: result.rows.length,
        availableRooms: availableRooms,
        unavailableRooms: unavailableRooms,
        updatedRooms: result.rows
      }
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการอัปเดตสถานะห้อง:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะห้อง',
      error: error.message
    });
  }
};

/**
 * แก้ไขสถานะห้องเฉพาะห้องที่ระบุ
 */
exports.fixRoomStatus = async (req, res) => {
  try {
    const { dormId, roomNumber } = req.params;
    
    // ตรวจสอบสัญญาที่ active ของห้องนี้
    const checkContractQuery = `
      SELECT c.contract_id, c.status 
      FROM contracts c
      JOIN rooms r ON c.room_id = r.room_id  
      WHERE r.dorm_id = $1 AND r.room_number = $2 AND c.status = 'active'
    `;
    
    const contractResult = await pool.query(checkContractQuery, [dormId, roomNumber]);
    const hasActiveContract = contractResult.rows.length > 0;
    
    // อัปเดตสถานะห้อง
    const updateRoomQuery = `
      UPDATE rooms 
      SET available = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE dorm_id = $1 AND room_number = $2
      RETURNING room_id, room_number, available
    `;
    
    const roomResult = await pool.query(updateRoomQuery, [dormId, roomNumber, !hasActiveContract]);
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องที่ระบุ'
      });
    }
    
    console.log(`✅ อัปเดตสถานะห้อง ${roomNumber}: available = ${!hasActiveContract}`);
    
    res.json({
      success: true,
      message: `อัปเดตสถานะห้อง ${roomNumber} สำเร็จ`,
      data: {
        roomNumber: roomNumber,
        available: !hasActiveContract,
        hasActiveContract: hasActiveContract,
        contractsFound: contractResult.rows.length
      }
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการแก้ไขสถานะห้อง:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขสถานะห้อง',
      error: error.message
    });
  }
};
