const prisma = require('../config/prisma');

// 📌 ดึงข้อมูลชั้นของหอพัก (จากตาราง rooms)
exports.getDormFloors = async (req, res) => {
  try {
    const dormId = parseInt(req.params.dormId);
    const result = await prisma.rooms.groupBy({
      by: ['floor_number'],
      where: {
        dorm_id: dormId
      },
      _count: {
        _all: true
      },
      orderBy: {
        floor_number: 'asc'
      }
    });
    
    const floors = result.map(floor => ({
      floor_number: floor.floor_number,
      room_count: floor._count._all
    }));
    
    res.json(floors);
  } catch (err) {
    console.error("getDormFloors error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 📌 อัปเดตข้อมูลชั้น (ไม่ต้องทำอะไรเพราะข้อมูลอยู่ใน rooms แล้ว)
exports.updateDormFloors = async (req, res) => {
  try {
    // ข้อมูลชั้นจะถูกอัปเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลงห้องในตาราง rooms
    res.json({ message: 'ข้อมูลชั้นจะอัปเดตอัตโนมัติตามข้อมูลห้อง' });
  } catch (err) {
    console.error('updateDormFloors error:', err);
    res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};

// 📌 ดึงข้อมูลห้องทั้งหมดของหอพัก
exports.getDormRooms = async (req, res) => {
  try {
    const dormId = parseInt(req.params.dormId);
    const result = await prisma.rooms.findMany({
      where: {
        dorm_id: dormId
      },
      orderBy: [
        { floor_number: 'asc' },
        { room_number: 'asc' }
      ]
    });
    res.json(result);
  } catch (err) {
    console.error("getDormRooms error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 📌 ดึงข้อมูลห้องจัดกลุ่มตามชั้น (รองรับชั้นที่ไม่มีห้อง)
exports.getDormRoomsByFloor = async (req, res) => {
  try {
    const dormId = parseInt(req.params.dormId);
    
    // ดึงข้อมูลห้องทั้งหมด พร้อมชื่อผู้เช่า (active)
    const rooms = await prisma.rooms.findMany({
      where: {
        dorm_id: dormId
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
        }
      },
      orderBy: [
        { floor_number: 'asc' },
        { room_number: 'asc' }
      ]
    });

    // ดึงข้อมูลชั้นทั้งหมดที่เคยมี
    const floorNumbers = await prisma.rooms.findMany({
      where: {
        dorm_id: dormId
      },
      select: {
        floor_number: true
      },
      distinct: ['floor_number'],
      orderBy: {
        floor_number: 'asc'
      }
    });

    // สร้างชั้นทั้งหมด (รองรับชั้นที่ไม่มีห้อง)
    const maxFloor = floorNumbers.length > 0 ? Math.max(...floorNumbers.map(f => f.floor_number)) : 1;
    const allFloors = Array.from({length: maxFloor}, (_, i) => i + 1);
    
    const roomsByFloor = {};

    // สร้างชั้นทั้งหมดก่อน
    allFloors.forEach(floorNumber => {
      roomsByFloor[floorNumber] = {
        floorNumber,
        rooms: []
      };
    });

    // เพิ่มห้องเข้าไปในชั้นที่มี
    rooms.forEach(room => {
      const activeContract = room.contracts.find(c => c.status === 'active');
      const tenant = activeContract?.tenants;
      
      roomsByFloor[room.floor_number].rooms.push({
        room_id: room.room_id,
        number: room.room_number,
        available: room.available,
        room_type_id: room.room_type_id,
        first_name: tenant?.first_name || null,
        last_name: tenant?.last_name || null
      });
    });

    // แปลงเป็น array และเรียงลำดับ
    const floorsArray = Object.values(roomsByFloor).sort((a, b) => a.floorNumber - b.floorNumber);
    res.json(floorsArray);
  } catch (err) {
    console.error("getDormRoomsByFloor error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
};

// 📌 อัปเดตข้อมูลห้องทั้งหมด
exports.updateDormRooms = async (req, res) => {
  try {
    const dormId = parseInt(req.params.dormId);
    const { floors } = req.body;

    if (!floors || !Array.isArray(floors)) {
      throw new Error('floors array is required');
    }

    await prisma.$transaction(async (tx) => {
      // Step 1: Get all current room numbers from frontend
      const frontendRoomNumbers = [];
      floors.forEach(floor => {
        floor.rooms.forEach(room => {
          frontendRoomNumbers.push(room.number);
        });
      });


      // Step 2: Check if rooms to be deleted have any data
      let roomsToDelete = [];
      if (frontendRoomNumbers.length > 0) {
        roomsToDelete = await tx.rooms.findMany({
          where: {
            dorm_id: dormId,
            room_number: {
              notIn: frontendRoomNumbers
            }
          },
          select: {
            room_id: true,
            room_number: true
          }
        });
      } else {
        roomsToDelete = await tx.rooms.findMany({
          where: {
            dorm_id: dormId
          },
          select: {
            room_id: true,
            room_number: true
          }
        });
      }

      if (roomsToDelete.length > 0) {
        const roomIds = roomsToDelete.map(r => r.room_id);
        
        // Check for contracts
        const contractCount = await tx.contracts.count({
          where: {
            room_id: {
              in: roomIds
            }
          }
        });
        
        // Check for meter readings
        const meterCount = await tx.meter_readings.count({
          where: {
            room_id: {
              in: roomIds
            }
          }
        });
        
        // Check for invoice receipts
        const invoiceCount = await tx.invoice_receipts.count({
          where: {
            room_id: {
              in: roomIds
            }
          }
        });

        if (contractCount > 0 || meterCount > 0 || invoiceCount > 0) {
          const roomsWithData = roomsToDelete.map(r => r.room_number).join(', ');
          throw new Error(`ไม่สามารถลบห้อง ${roomsWithData} ได้ เนื่องจากมีข้อมูลการเช่า การอ่านมิเตอร์ หรือใบแจ้งหนี้อยู่`);
        }

        // Safe to delete - no data found
        const deleteResult = await tx.rooms.deleteMany({
          where: {
            room_id: {
              in: roomIds
            }
          }
        });
        const deletedRoomNumbers = roomsToDelete.map(r => r.room_number).join(', ');
        console.log(`🗑️ Safely deleted ${deleteResult.count} rooms: ${deletedRoomNumbers}`);
      }

      // Step 3: Upsert all rooms from frontend
      for (const floor of floors) {


        for (const room of floor.rooms) {
          
          await tx.rooms.upsert({
            where: {
              dorm_id_room_number: {
                dorm_id: dormId,
                room_number: room.number
              }
            },
            update: {
              available: room.available,
              room_type_id: room.room_type_id || null,
              floor_number: floor.floorNumber
            },
            create: {
              dorm_id: dormId,
              floor_number: floor.floorNumber,
              room_number: room.number,
              available: room.available,
              room_type_id: room.room_type_id || null
            }
          });
        }
      }
    });
    res.json({ message: 'อัปเดตข้อมูลห้องสำเร็จ' });
  } catch (err) {
    console.error('❌ updateDormRooms error:', err);
    res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};

// 📌 อัปเดตห้องเดียว
exports.updateSingleRoom = async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const { room_number, available, room_type_id } = req.body;
    
    const result = await prisma.rooms.update({
      where: {
        room_id: roomId
      },
      data: {
        room_number,
        available,
        room_type_id: room_type_id || null,
        updated_at: new Date()
      }
    });

    res.json(result);
  } catch (err) {
    console.error('updateSingleRoom error:', err);
    if (err.code === 'P2002') { // unique constraint violation
      res.status(400).json({ error: "หมายเลขห้องนี้ซ้ำกับห้องอื่นแล้ว" });
    } else if (err.code === 'P2025') { // record not found
      res.status(404).json({ error: "ไม่พบห้องที่ต้องการแก้ไข" });
    } else {
      res.status(500).json({ error: 'Internal Server Error: ' + err.message });
    }
  }
};

// 📌 อัปเดตเฉพาะห้องที่เลือกเท่านั้น
exports.bulkUpdateRooms = async (req, res) => {
  try {
    const dormId = parseInt(req.params.dormId);
    const { floors } = req.body;

    await prisma.$transaction(async (tx) => {
      for (const floor of floors) {
        for (const room of floor.rooms) {
          await tx.rooms.updateMany({
            where: {
              dorm_id: dormId,
              floor_number: floor.floorNumber,
              room_number: room.number
            },
            data: {
              available: room.available,
              room_type_id: room.room_type_id ?? null,
              updated_at: new Date()
            }
          });
        }
      }
    });

    res.json({ message: "อัปเดตห้องที่เลือกสำเร็จ" });
  } catch (err) {
    console.error("bulkUpdateRooms error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
};

// 📌 ลบห้องหลายห้อง
exports.deleteMultipleRooms = async (req, res) => {
  try {
    const { roomIds } = req.body; // array of room IDs
    
    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({ error: "กรุณาระบุรายการ ID ของห้องที่ต้องการลบ" });
    }

    const roomIdsInt = roomIds.map(id => parseInt(id));

    const result = await prisma.$transaction(async (tx) => {
      // Get rooms before deletion
      const deletedRooms = await tx.rooms.findMany({
        where: {
          room_id: {
            in: roomIdsInt
          }
        }
      });

      // Delete rooms
      const deleteResult = await tx.rooms.deleteMany({
        where: {
          room_id: {
            in: roomIdsInt
          }
        }
      });

      return {
        count: deleteResult.count,
        deletedRooms
      };
    });
    
    res.json({ 
      message: `ลบห้องสำเร็จ ${result.count} ห้อง`,
      deletedRooms: result.deletedRooms
    });

  } catch (err) {
    console.error('deleteMultipleRooms error:', err);
    res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};

// 📌 ดึงข้อมูลห้องรายละเอียดพร้อมผู้เช่าและมิเตอร์
exports.getRoomDetail = async (req, res) => {
  try {
    const dormId = parseInt(req.params.dormId);
    const roomId = parseInt(req.params.roomId);
    
    // ดึงข้อมูลห้องพร้อมผู้เช่าและอัตราค่าใช้จ่าย
    const room = await prisma.rooms.findFirst({
      where: {
        dorm_id: dormId,
        room_id: roomId
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
                last_name: true,
                phone_number: true
              }
            }
          }
        },
        room_types: {
          select: {
            room_type_name: true,
            monthly_rent: true
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลห้อง' });
    }

    // Get latest utility rates
    const utilityRate = await prisma.utility_rates.findFirst({
      where: {
        dorm_id: dormId
      },
      orderBy: {
        start_date: 'desc'
      },
      select: {
        water_rate: true,
        electricity_rate: true
      }
    });

    // ดึงข้อมูลมิเตอร์ล่าสุด 2 ครั้ง เพื่อคำนวณการใช้งาน
    const meterReadings = await prisma.meter_readings.findMany({
      where: {
        room_id: roomId
      },
      include: {
        meter_records: {
          select: {
            meter_record_date: true
          }
        }
      },
      orderBy: {
        meter_records: {
          meter_record_date: 'desc'
        }
      },
      take: 2
    });

    let meterData = {
      current_water: 0,
      current_electric: 0,
      previous_water: 0,
      previous_electric: 0,
      meter_record_date: null
    };

    if (meterReadings.length > 0) {
      const latest = meterReadings[0];
      const previous = meterReadings[1];
      
      meterData = {
        current_water: latest.water_curr || 0,
        current_electric: latest.electric_curr || 0,
        previous_water: previous?.water_curr || latest.water_prev || 0,
        previous_electric: previous?.electric_curr || latest.electric_prev || 0,
        meter_record_date: latest.meter_records?.meter_record_date || null
      };
    }

    // คำนวณการใช้งาน
    const waterUsage = Math.max(0, meterData.current_water - meterData.previous_water);
    const electricUsage = Math.max(0, meterData.current_electric - meterData.previous_electric);

    // Get active contract and tenant info
    const activeContract = room.contracts.find(c => c.status === 'active');
    const tenant = activeContract?.tenants;

    // รวมข้อมูล
    const roomDetail = {
      room_id: room.room_id,
      room_number: room.room_number,
      floor_number: room.floor_number,
      tenant_name: tenant?.first_name && tenant?.last_name 
        ? `${tenant.first_name} ${tenant.last_name}` 
        : 'ไม่มีผู้เช่า',
      phone_number: tenant?.phone_number || null,
      status: activeContract ? 'มีผู้เช่า' : 'ว่าง',
      contract_id: activeContract?.contract_id || null,
      room_type: room.room_types?.room_type_name || '',
      monthly_rent: room.room_types?.monthly_rent || 0,
      water_rate: utilityRate?.water_rate || 15,
      electricity_rate: utilityRate?.electricity_rate || 8,
      meter: {
        current_water: meterData.current_water,
        current_electric: meterData.current_electric,
        previous_water: meterData.previous_water,
        previous_electric: meterData.previous_electric,
        water_usage: waterUsage,
        electric_usage: electricUsage,
        last_update: meterData.meter_record_date
      }
    };

    res.json(roomDetail);

  } catch (err) {
    console.error('getRoomDetail error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// 📌 ตรวจสอบว่าห้องไหนมีข้อมูลอยู่ (สำหรับการแสดงผลในหน้าจัดการห้อง)
exports.checkRoomsData = async (req, res) => {
  try {
    const dormId = parseInt(req.params.dormId);
    
    const rooms = await prisma.rooms.findMany({
      where: {
        dorm_id: dormId
      },
      include: {
        contracts: {
          select: {
            contract_id: true
          }
        },
        meter_readings: {
          select: {
            meter_reading_id: true
          },
          take: 1
        },
        invoice_receipts: {
          select: {
            invoice_receipt_id: true
          },
          take: 1
        }
      },
      orderBy: [
        { floor_number: 'asc' },
        { room_number: 'asc' }
      ]
    });

    const roomsData = {};
    rooms.forEach(room => {
      const hasData = 
        room.contracts.length > 0 || 
        room.meter_readings.length > 0 || 
        room.invoice_receipts.length > 0;
        
      roomsData[room.room_number] = {
        room_id: room.room_id,
        has_data: hasData
      };
    });

    res.json(roomsData);
  } catch (err) {
    console.error('checkRoomsData error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
