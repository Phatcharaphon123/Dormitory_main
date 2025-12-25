const prisma = require('../config/prisma');

/**
 * อัปเดตสถานะห้องให้เป็นว่าง เมื่อไม่มีสัญญาที่ active
 */
exports.updateRoomAvailability = async (req, res) => {
  try {
    // อัปเดตสถานะห้องทั้งหมดในหอพักให้ตรงกับสถานะสัญญา
    const { dormId } = req.params;
    const dormIdInt = parseInt(dormId);
    
    // ดึงข้อมูลห้องและสัญญาของหอพักนี้
    const rooms = await prisma.rooms.findMany({
      where: {
        dorm_id: dormIdInt
      },
      include: {
        contracts: {
          where: {
            status: 'active'
          }
        }
      }
    });
    
    // อัปเดตสถานะแต่ละห้อง
    const updatePromises = rooms.map(room => {
      const hasActiveContract = room.contracts.length > 0;
      return prisma.rooms.update({
        where: {
          room_id: room.room_id
        },
        data: {
          available: !hasActiveContract,
          updated_at: new Date()
        },
        select: {
          room_id: true,
          room_number: true,
          available: true
        }
      });
    });
    
    const updatedRooms = await Promise.all(updatePromises);

    // นับจำนวนห้องที่เปลี่ยนสถานะ
    const availableRooms = updatedRooms.filter(room => room.available).length;
    const unavailableRooms = updatedRooms.filter(room => !room.available).length;
    
    res.json({
      success: true,
      message: 'อัปเดตสถานะห้องสำเร็จ',
      data: {
        totalUpdated: updatedRooms.length,
        availableRooms: availableRooms,
        unavailableRooms: unavailableRooms,
        updatedRooms: updatedRooms
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
    const dormIdInt = parseInt(dormId);
    
    // ตรวจสอบสัญญาที่ active ของห้องนี้
    const room = await prisma.rooms.findFirst({
      where: {
        dorm_id: dormIdInt,
        room_number: roomNumber
      },
      include: {
        contracts: {
          where: {
            status: 'active'
          }
        }
      }
    });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องที่ระบุ'
      });
    }
    
    const hasActiveContract = room.contracts.length > 0;
    
    // อัปเดตสถานะห้อง
    const updatedRoom = await prisma.rooms.update({
      where: {
        room_id: room.room_id
      },
      data: {
        available: !hasActiveContract,
        updated_at: new Date()
      },
      select: {
        room_id: true,
        room_number: true,
        available: true
      }
    });
    
    res.json({
      success: true,
      message: `อัปเดตสถานะห้อง ${roomNumber} สำเร็จ`,
      data: {
        roomNumber: roomNumber,
        available: !hasActiveContract,
        hasActiveContract: hasActiveContract,
        contractsFound: room.contracts.length
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
