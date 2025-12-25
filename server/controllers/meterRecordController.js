const  prisma  = require('../config/prisma');

// 0. ดึงข้อมูลห้องและมิเตอร์ล่าสุดสำหรับ dormitory
exports.getRoomsWithLatestMeter = async (req, res) => {
  const { dormId } = req.params;

  try {
    // ดึงข้อมูลห้องทั้งหมดในหอนั้น
    const rooms = await prisma.rooms.findMany({
      where: {
        dorm_id: parseInt(dormId)
      },
      include: {
        contracts: {
          where: {
            status: 'active'
          },
          select: {
            contract_id: true
          },
          take: 1
        }
      },
      orderBy: [
        { floor_number: 'asc' },
        { room_number: 'asc' }
      ]
    });

    // หา record ล่าสุด
    const latestRecord = await prisma.meter_records.findFirst({
      where: {
        dorm_id: parseInt(dormId)
      },
      orderBy: {
        meter_record_date: 'desc'
      },
      select: {
        meter_record_id: true,
        meter_record_date: true
      }
    });

    let readingsMap = new Map();

    if (latestRecord) {
      const readings = await prisma.meter_readings.findMany({
        where: {
          meter_record_id: latestRecord.meter_record_id
        },
        include: {
          rooms: {
            select: {
              room_number: true
            }
          }
        }
      });
      
      readings.forEach(r => {
        readingsMap.set(r.room_id, {
          water_prev: r.water_curr,
          electric_prev: r.electric_curr
        });
      });
    }

    // รวมค่ากลับ
    const mergedRooms = rooms.map(room => {
      const readings = readingsMap.get(room.room_id) || {};
      const hasActiveContract = room.contracts && room.contracts.length > 0;

      return {
        room_id: room.room_id,
        floor_number: room.floor_number,
        room_number: room.room_number,
        tenant: hasActiveContract ? 'มีผู้เช่า' : 'ว่าง',
        contract_id: hasActiveContract ? room.contracts[0].contract_id : null,
        water_prev: readings.water_prev || 0,
        electric_prev: readings.electric_prev || 0,
        water_curr: 0,
        electric_curr: 0,
        hasDigitalMeter: true,
      };
    });

    // รวมกลุ่มเป็น floor → [{ floorNumber, rooms: [...] }]
    const groupedByFloor = {};
    for (const room of mergedRooms) {
      if (!groupedByFloor[room.floor_number]) {
        groupedByFloor[room.floor_number] = [];
      }
      groupedByFloor[room.floor_number].push(room);
    }

    const floors = Object.entries(groupedByFloor).map(([floorNumber, rooms]) => ({
      floorNumber: parseInt(floorNumber),
      rooms
    }));

    res.json({
      latest_meter_record_date: latestRecord?.meter_record_date || null,
      floors
    });

  } catch (err) {
    console.error('❌ getRoomsWithLatestMeter error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
};

exports.createMeterRecord = async (req, res) => {
  const { dormId } = req.params;
  const { readings, recordDate } = req.body;
  
  console.log('📥 CreateMeterRecord - Received data:', {
    dormId,
    recordDate,
    readingsCount: readings?.length,
    readings: readings ? readings.map(r => ({
      room_id: r.room_id,
      type: r.type,
      curr_value: r.curr_value,
      prev_value: r.prev_value
    })) : 'No readings'
  });

  // Validate input data
  if (!dormId) {
    return res.status(400).json({ message: 'ไม่พบรหัสหอพัก' });
  }

  if (!recordDate) {
    return res.status(400).json({ message: 'ไม่พบวันที่บันทึก' });
  }

  if (!readings || !Array.isArray(readings) || readings.length === 0) {
    return res.status(400).json({ message: 'ไม่พบข้อมูลการอ่านมิเตอร์' });
  }

  // Validate each reading
  for (const reading of readings) {
    if (!reading.room_id) {
      return res.status(400).json({ message: 'ไม่พบรหัสห้อง' });
    }
    if (!reading.type || !['water', 'electric'].includes(reading.type)) {
      return res.status(400).json({ message: 'ประเภทมิเตอร์ไม่ถูกต้อง' });
    }
    if (reading.curr_value === null || reading.curr_value === undefined || isNaN(reading.curr_value)) {
      return res.status(400).json({ message: `ค่ามิเตอร์ปัจจุบันไม่ถูกต้อง: ห้อง ID ${reading.room_id}` });
    }
    if (reading.prev_value === null || reading.prev_value === undefined || isNaN(reading.prev_value)) {
      return res.status(400).json({ message: `ค่ามิเตอร์เดิมไม่ถูกต้อง: ห้อง ID ${reading.room_id}` });
    }
  }

  const month = new Date(recordDate);
  month.setDate(1);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // ✅ 1. เช็กว่ามีอยู่แล้วในวันเดียวกัน
      const existingRecord = await tx.meter_records.findFirst({
        where: {
          dorm_id: parseInt(dormId),
          meter_record_date: {
            gte: new Date(recordDate + 'T00:00:00.000Z'),
            lt: new Date(recordDate + 'T23:59:59.999Z')
          }
        }
      });

      if (existingRecord) {
        throw new Error('มีการจดมิเตอร์วันนี้แล้ว');
      }

      // ✅ 2. ยังไม่มี → สร้างใบจดใหม่
      const meterRecord = await tx.meter_records.create({
        data: {
          dorm_id: parseInt(dormId),
          meter_record_date: new Date(recordDate)
        }
      });

      const meterRecordId = meterRecord.meter_record_id;

      // ✅ 3. ดึงข้อมูล utility rates ล่าสุดสำหรับหอนี้
      const rates = await tx.utility_rates.findFirst({
        where: {
          dorm_id: parseInt(dormId)
        },
        orderBy: {
          start_date: 'desc'
        }
      });
      
      const finalRates = rates || { water_rate: 15, electricity_rate: 7 }; // ค่าเริ่มต้น

      // ✅ 4. รวม readings ต่อห้องไว้ใน map
      const readingsMap = new Map();

      readings.forEach(({ room_id, type, curr_value, prev_value }) => {
        if (!readingsMap.has(room_id)) {
          readingsMap.set(room_id, {
            water_curr: null, water_prev: null,
            electric_curr: null, electric_prev: null
          });
        }
        const data = readingsMap.get(room_id);
        if (type === 'water') {
          data.water_curr = curr_value;
          data.water_prev = prev_value;
        }
        if (type === 'electric') {
          data.electric_curr = curr_value;
          data.electric_prev = prev_value;
        }
      });

      // ✅ ประกาศ function ก่อนใช้
      const unitUsed = (curr, prev) => {
        const c = parseInt(curr);
        const p = parseInt(prev);
        return !isNaN(c) && !isNaN(p) ? Math.max(0, c - p) : null;
      };

      // ✅ Insert readings
      const readingData = Array.from(readingsMap.entries()).map(([room_id, reading]) => {
        const {
          water_prev, water_curr,
          electric_prev, electric_curr
        } = reading;

        return {
          meter_record_id: meterRecordId,
          room_id: parseInt(room_id),
          water_prev: water_prev,
          water_curr: water_curr,
          electric_prev: electric_prev,
          electric_curr: electric_curr,
          water_unit_used: unitUsed(water_curr, water_prev),
          electric_unit_used: unitUsed(electric_curr, electric_prev),
          month: month,
          water_rate: finalRates.water_rate,
          electricity_rate: finalRates.electricity_rate
        };
      });

      await tx.meter_readings.createMany({
        data: readingData
      });

      return meterRecordId;
    });

    res.status(201).json({
      message: 'สร้างใบจดมิเตอร์ใหม่เรียบร้อยแล้ว',
      meter_record_id: result
    });

  } catch (err) {
    console.error('❌ Error creating meter record:', err.stack);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างใบจดมิเตอร์: ' + err.message });
  }
};

exports.getMeterRecords = async (req, res) => {
  const { dormId } = req.params;
  try {
    const result = await prisma.meter_records.findMany({
      where: {
        dorm_id: parseInt(dormId)
      },
      select: {
        meter_record_id: true,
        meter_record_date: true,
        created_at: true,
        updated_at: true
      },
      orderBy: {
        meter_record_date: 'desc'
      }
    });

    res.json(result);
  } catch (err) {
    console.error('❌ Error fetching meter records:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบจดมิเตอร์' });
  }
};

exports.getMeterRecordById = async (req, res) => {
  const { dormId, recordId } = req.params;

  try {
    // ดึงข้อมูลใบจดหลัก
    const meterRecord = await prisma.meter_records.findFirst({
      where: {
        meter_record_id: parseInt(recordId),
        dorm_id: parseInt(dormId)
      }
    });

    if (!meterRecord) {
      return res.status(404).json({ message: 'ไม่พบใบจดมิเตอร์นี้' });
    }

    // ดึงข้อมูลห้องทั้งหมดในหอพัก
    const rooms = await prisma.rooms.findMany({
      where: {
        dorm_id: parseInt(dormId)
      },
      include: {
        contracts: {
          where: {
            status: 'active'
          },
          select: {
            contract_id: true
          },
          take: 1
        }
      },
      orderBy: [
        { floor_number: 'asc' },
        { room_number: 'asc' }
      ]
    });

    // ดึง readings สำหรับใบจดมิเตอร์นี้
    const meterReadings = await prisma.meter_readings.findMany({
      where: {
        meter_record_id: parseInt(recordId)
      }
    });

    // สร้าง map ของ readings
    const readingsMap = new Map();
    meterReadings.forEach(reading => {
      readingsMap.set(reading.room_id, reading);
    });
    
    // กลุ่มตามชั้นและรวมข้อมูลทุกห้อง
    const grouped = {};
    rooms.forEach(r => {
      const floor = r.floor_number;
      if (!grouped[floor]) grouped[floor] = [];
      
      const reading = readingsMap.get(r.room_id) || {
        water_prev: 0,
        water_curr: 0,
        electric_prev: 0,
        electric_curr: 0
      };

      const hasActiveContract = r.contracts && r.contracts.length > 0;

      grouped[floor].push({
        room_id: r.room_id,
        room_number: r.room_number,
        status_id: r.status_id,
        tenant: hasActiveContract ? 'มีผู้เช่า' : 'ว่าง',
        contract_id: hasActiveContract ? r.contracts[0].contract_id : null,
        water_prev: reading.water_prev,
        water_curr: reading.water_curr,
        electric_prev: reading.electric_prev,
        electric_curr: reading.electric_curr
      });
    });

    const floors = Object.entries(grouped).map(([floorNumber, rooms]) => ({
      floorNumber: parseInt(floorNumber),
      rooms
    }));

    const readings = meterReadings.map(r => ({
      room_id: r.room_id,
      water_curr: r.water_curr,
      electric_curr: r.electric_curr
    }));
  
    const recordDate = new Date(meterRecord.meter_record_date);
    const thaiDate = recordDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }); 

    // ส่งกลับ
    res.json({
      meter_record_id: meterRecord.meter_record_id,
      dorm_id: meterRecord.dorm_id,
      meter_record_date: thaiDate, 
      floors,
      readings
    });

  } catch (err) {
    console.error('❌ Error fetching meter record by ID:', err.stack);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงใบจดมิเตอร์' });
  }
};

exports.updateMeterRecordById = async (req, res) => {
  const { dormId, recordId } = req.params;
  const { meter_record_date, readings } = req.body;
  
  console.log('📥 UpdateMeterRecordById - Received data:', {
    dormId,
    recordId,
    meter_record_date,
    readingsCount: readings?.length
  });

  if (!meter_record_date) {
    return res.status(400).json({ message: 'ไม่พบวันที่บันทึกมิเตอร์' });
  }

  if (!readings || readings.length === 0) {
    return res.status(400).json({ message: 'ไม่พบข้อมูลการอ่านมิเตอร์' });
  }

  const month = new Date(meter_record_date);
  month.setDate(1);

  try {
    await prisma.$transaction(async (tx) => {
      // ตรวจสอบ record
      const existingRecord = await tx.meter_records.findFirst({
        where: {
          meter_record_id: parseInt(recordId),
          dorm_id: parseInt(dormId)
        }
      });
      
      if (!existingRecord) {
        throw new Error('ไม่พบใบจดมิเตอร์นี้');
      }

      // อัปเดตวันที่ record
      await tx.meter_records.update({
        where: {
          meter_record_id: parseInt(recordId)
        },
        data: {
          meter_record_date: new Date(meter_record_date)
        }
      });

      // ลบ readings เก่าทั้งหมด
      await tx.meter_readings.deleteMany({
        where: {
          meter_record_id: parseInt(recordId)
        }
      });

      // ✅ เพิ่ม function คำนวณ
      const unitUsed = (curr, prev) => {
        const c = parseInt(curr);
        const p = parseInt(prev);
        return !isNaN(c) && !isNaN(p) ? Math.max(0, c - p) : null;
      };

      // ✅ ดึงข้อมูล utility rates ล่าสุดสำหรับหอนี้
      const rates = await tx.utility_rates.findFirst({
        where: {
          dorm_id: parseInt(dormId)
        },
        orderBy: {
          start_date: 'desc'
        }
      });
      
      const finalRates = rates || { water_rate: 15, electricity_rate: 7 }; // ค่าเริ่มต้น

      // สร้าง readings ใหม่
      const readingData = readings.map(r => ({
        meter_record_id: parseInt(recordId),
        room_id: parseInt(r.room_id),
        water_prev: r.water_prev,
        water_curr: r.water_curr,
        water_unit_used: unitUsed(r.water_curr, r.water_prev),
        electric_prev: r.electric_prev,
        electric_curr: r.electric_curr,
        electric_unit_used: unitUsed(r.electric_curr, r.electric_prev),
        month: month,
        water_rate: finalRates.water_rate,
        electricity_rate: finalRates.electricity_rate
      }));

      await tx.meter_readings.createMany({
        data: readingData
      });
    });

    res.json({ message: 'อัปเดตใบจดมิเตอร์เรียบร้อยแล้ว' });

  } catch (err) {
    console.error('❌ Error updating meter record:', err.stack);
    console.error('📄 Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail
    });
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการอัปเดตใบจดมิเตอร์: ' + err.message,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.deleteMeterRecordById = async (req, res) => {
  const { dormId, recordId } = req.params;

  try {
    // ตรวจสอบว่า record นี้มีอยู่จริง
    const existingRecord = await prisma.meter_records.findFirst({
      where: {
        meter_record_id: parseInt(recordId),
        dorm_id: parseInt(dormId)
      }
    });

    if (!existingRecord) {
      return res.status(404).json({ message: 'ไม่พบใบจดมิเตอร์นี้' });
    }

    // ลบข้อมูล (Prisma จะลบ meter_readings อัตโนมัติ ถ้ามี CASCADE)
    await prisma.meter_records.delete({
      where: {
        meter_record_id: parseInt(recordId)
      }
    });

    res.json({ message: '✅ ลบใบจดมิเตอร์และข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('❌ Error deleting meter record:', err.stack);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบใบจดมิเตอร์' });
  }
};
