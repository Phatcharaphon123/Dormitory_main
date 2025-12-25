const prisma = require('../config/prisma');

// ดึงข้อมูลมิเตอร์ทั้งหมดของหอพัก
exports.getDormMeters = async (req, res) => {
  const { dormId } = req.params;
  const dormIdInt = parseInt(dormId);

  try {
    // ดึงข้อมูลห้องพร้อมผู้เช่า
    const rooms = await prisma.rooms.findMany({
      where: {
        dorm_id: dormIdInt
      },
      include: {
        contracts: {
          where: {
            status: 'active'
          },
          include: {
            tenants: {
              select: {
                first_name: true,
                last_name: true
              }
            }
          }
        },
        meter_electricity: {
          select: {
            electricity_meter_code: true,
            updated_at: true,
            installation_date: true
          }
        },
        meter_water: {
          select: {
            water_meter_code: true,
            updated_at: true,
            installation_date: true
          }
        }
      },
      orderBy: [
        { floor_number: 'asc' },
        { room_number: 'asc' }
      ]
    });

    // รวมข้อมูลห้องกับมิเตอร์
    const roomsWithMeters = rooms.map(room => {
      const activeContract = room.contracts && room.contracts.length > 0 ? room.contracts[0] : null;
      const tenant = activeContract?.tenants;
      const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : null;
      
      return {
        roomId: room.room_id,
        roomNumber: room.room_number,
        floor: room.floor_number,
        available: room.available,
        tenant: tenantName,
        contractStatus: activeContract?.status || null,
        meters: {
          electric: room.meter_electricity ? {
            installed: true,
            code: room.meter_electricity.electricity_meter_code,
            updatedAt: room.meter_electricity.updated_at,
            installationDate: room.meter_electricity.installation_date
          } : {
            installed: false
          },
          water: room.meter_water ? {
            installed: true,
            code: room.meter_water.water_meter_code,
            updatedAt: room.meter_water.updated_at,
            installationDate: room.meter_water.installation_date
          } : {
            installed: false
          }
        }
      };
    });

    // จัดกลุ่มตามชั้น
    const groupedByFloor = {};
    roomsWithMeters.forEach(room => {
      const floor = `ชั้น ${room.floor}`;
      if (!groupedByFloor[floor]) {
        groupedByFloor[floor] = [];
      }
      groupedByFloor[floor].push(room);
    });

    res.json(groupedByFloor);
  } catch (error) {
    console.error('Error fetching dorm meters:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลมิเตอร์' });
  }
};

// เพิ่มมิเตอร์ไฟฟ้า
exports.addElectricMeter = async (req, res) => {
  const { roomId, meterCode, installationDate, installationTime } = req.body;
  const roomIdInt = parseInt(roomId);

  try {
    // รวมวันที่และเวลาติดตั้ง
    let installationDateTime = null;
    if (installationDate && installationTime) {
      installationDateTime = new Date(`${installationDate} ${installationTime}:00`);
    }

    // ตรวจสอบว่ามิเตอร์ใน room นี้มีอยู่แล้วหรือไม่
    const existingMeter = await prisma.meter_electricity.findFirst({
      where: {
        room_id: roomIdInt
      }
    });

    let result;
    if (existingMeter) {
      // อัปเดตมิเตอร์ที่มีอยู่
      const updateData = {
        electricity_meter_code: meterCode,
        updated_at: new Date()
      };
      
      if (installationDateTime) {
        updateData.installation_date = installationDateTime;
      }
      
      result = await prisma.meter_electricity.update({
        where: {
          room_id: roomIdInt
        },
        data: updateData
      });
      
      res.json({ 
        message: 'อัปเดตมิเตอร์ไฟฟ้าสำเร็จ',
        meter: result
      });
    } else {
      // เพิ่มมิเตอร์ใหม่
      const createData = {
        room_id: roomIdInt,
        electricity_meter_code: meterCode
      };
      
      if (installationDateTime) {
        createData.installation_date = installationDateTime;
      }
      
      result = await prisma.meter_electricity.create({
        data: createData
      });
      
      res.json({ 
        message: 'เพิ่มมิเตอร์ไฟฟ้าสำเร็จ',
        meter: result
      });
    }
  } catch (error) {
    console.error('Error adding electric meter:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มมิเตอร์ไฟฟ้า' });
  }
};

// เพิ่มมิเตอร์น้ำ
exports.addWaterMeter = async (req, res) => {
  const { roomId, meterCode, installationDate, installationTime } = req.body;
  const roomIdInt = parseInt(roomId);

  try {
    // รวมวันที่และเวลาติดตั้ง
    let installationDateTime = null;
    if (installationDate && installationTime) {
      installationDateTime = new Date(`${installationDate} ${installationTime}:00`);
    }

    // ตรวจสอบว่ามิเตอร์ใน room นี้มีอยู่แล้วหรือไม่
    const existingMeter = await prisma.meter_water.findFirst({
      where: {
        room_id: roomIdInt
      }
    });

    let result;
    if (existingMeter) {
      // อัปเดตมิเตอร์ที่มีอยู่
      const updateData = {
        water_meter_code: meterCode,
        updated_at: new Date()
      };
      
      if (installationDateTime) {
        updateData.installation_date = installationDateTime;
      }
      
      result = await prisma.meter_water.update({
        where: {
          room_id: roomIdInt
        },
        data: updateData
      });
      
      res.json({ 
        message: 'อัปเดตมิเตอร์น้ำสำเร็จ',
        meter: result
      });
    } else {
      // เพิ่มมิเตอร์ใหม่
      const createData = {
        room_id: roomIdInt,
        water_meter_code: meterCode
      };
      
      if (installationDateTime) {
        createData.installation_date = installationDateTime;
      }
      
      result = await prisma.meter_water.create({
        data: createData
      });
      
      res.json({ 
        message: 'เพิ่มมิเตอร์น้ำสำเร็จ',
        meter: result
      });
    }
  } catch (error) {
    console.error('Error adding water meter:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มมิเตอร์น้ำ' });
  }
};

// ลบมิเตอร์ไฟฟ้า
exports.removeElectricMeter = async (req, res) => {
  const { roomId } = req.params;
  const roomIdInt = parseInt(roomId);

  try {
    const result = await prisma.meter_electricity.deleteMany({
      where: {
        room_id: roomIdInt
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'ไม่พบมิเตอร์ไฟฟ้าในห้องนี้' });
    }

    res.json({ message: 'ลบมิเตอร์ไฟฟ้าสำเร็จ' });
  } catch (error) {
    console.error('Error removing electric meter:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบมิเตอร์ไฟฟ้า' });
  }
};

// ลบมิเตอร์น้ำ
exports.removeWaterMeter = async (req, res) => {
  const { roomId } = req.params;
  const roomIdInt = parseInt(roomId);

  try {
    const result = await prisma.meter_water.deleteMany({
      where: {
        room_id: roomIdInt
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'ไม่พบมิเตอร์น้ำในห้องนี้' });
    }

    res.json({ message: 'ลบมิเตอร์น้ำสำเร็จ' });
  } catch (error) {
    console.error('Error removing water meter:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบมิเตอร์น้ำ' });
  }
};

