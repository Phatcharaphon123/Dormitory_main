const pool = require('../db');

// 0. ดึงข้อมูลห้องและมิเตอร์ล่าสุดสำหรับ dormitory
exports.getRoomsWithLatestMeter = async (req, res) => {
  const { dormId } = req.params;

  try {
    // ดึงข้อมูลห้องทั้งหมดในหอนั้น
    const roomResult = await pool.query(
      `SELECT 
          r.room_id, r.floor_number, r.room_number, r.status_id,
          c.contract_id
        FROM rooms r
        LEFT JOIN contracts c 
          ON r.room_id = c.room_id 
          AND c.status = 'active'
        WHERE r.dorm_id = $1
        ORDER BY r.floor_number, r.room_number`,
      [dormId]
    );
    const rooms = roomResult.rows;

    // หา record ล่าสุด
    const recordResult = await pool.query(
      `SELECT meter_record_id, meter_record_date
      FROM meter_records
      WHERE dorm_id = $1
      ORDER BY meter_record_date DESC
      LIMIT 1`,
      [dormId]
    );
    const latestRecord = recordResult.rows[0];

    let readingsMap = new Map();

    if (latestRecord) {
      const readingsResult = await pool.query(
        `SELECT r.room_id, r.room_number, water_curr, electric_curr
        FROM meter_readings mr
        JOIN rooms r ON mr.room_id = r.room_id
        WHERE meter_record_id = $1`,
        [latestRecord.meter_record_id]
      );
      readingsResult.rows.forEach(r => {
        readingsMap.set(r.room_id, {
          water_prev: r.water_curr,
          electric_prev: r.electric_curr
        });
      });
    }

    // รวมค่ากลับ
    const mergedRooms = rooms.map(room => {
      const readings = readingsMap.get(room.room_id) || {};

      return {
        room_id: room.room_id,
        floor_number: room.floor_number,
        room_number: room.room_number,
        tenant: room.contract_id ? 'มีผู้เช่า' : 'ว่าง', // แก้ไข: ดูจาก contract_id แทน status_id
        contract_id: room.contract_id || null,
        water_prev: readings.water_prev || 0,
        electric_prev: readings.electric_prev || 0,
        water_curr: 0,
        electric_curr: 0,
        hasDigitalMeter: true, // 🔧 ถ้าคุณยังไม่ได้ใช้จริงก็ตั้งค่า default ไปก่อน
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
    // ✅ 1. เช็กว่ามีอยู่แล้วในวันเดียวกัน
    const existingCheck = await pool.query(
      `SELECT meter_record_id FROM meter_records
       WHERE dorm_id = $1 AND meter_record_date::date = $2::date`,
      [dormId, recordDate]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ message: 'มีการจดมิเตอร์วันนี้แล้ว' });
    }

    // ✅ 2. ยังไม่มี → สร้างใบจดใหม่
    const recordResult = await pool.query(
      `INSERT INTO meter_records (dorm_id, meter_record_date)
       VALUES ($1, $2)
       RETURNING meter_record_id`,
      [dormId, recordDate]
    );

    const meterRecordId = recordResult.rows[0].meter_record_id;

    // ✅ 3. ดึงข้อมูล utility rates ล่าสุดสำหรับหอนี้
    const ratesResult = await pool.query(
      `SELECT water_rate, electricity_rate 
       FROM utility_rates 
       WHERE dorm_id = $1 
       ORDER BY start_date DESC 
       LIMIT 1`,
      [dormId]
    );
    
    const rates = ratesResult.rows[0] || { water_rate: 15, electricity_rate: 7 }; // ค่าเริ่มต้น

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
    const insertPromises = Array.from(readingsMap.entries()).map(([room_id, reading]) => {
      const {
        water_prev, water_curr,
        electric_prev, electric_curr
      } = reading;

      return pool.query(
        `INSERT INTO meter_readings (
          meter_record_id, room_id,
          water_prev, water_curr,
          electric_prev, electric_curr,
          water_unit_used, electric_unit_used, month,
          water_rate, electricity_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          meterRecordId,
          room_id,
          water_prev,
          water_curr,
          electric_prev,
          electric_curr,
          unitUsed(water_curr, water_prev),
          unitUsed(electric_curr, electric_prev),
          month,
          rates.water_rate,
          rates.electricity_rate
        ]
      );
    });

    await Promise.all(insertPromises);

    res.status(201).json({
      message: 'สร้างใบจดมิเตอร์ใหม่เรียบร้อยแล้ว',
      meter_record_id: meterRecordId
    });

  } catch (err) {
    console.error('❌ Error creating meter record:', err.stack);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างใบจดมิเตอร์' });
  }
};

exports.getMeterRecords = async (req, res) => {
  const { dormId } = req.params;
  try {
    const result = await pool.query(
      `SELECT 
          meter_record_id,
          meter_record_date,
          created_at,
          updated_at
       FROM meter_records
       WHERE dorm_id = $1
       ORDER BY meter_record_date DESC`,
      [dormId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching meter records:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบจดมิเตอร์' });
  }
};

exports.getMeterRecordById = async (req, res) => {
  const { dormId, recordId } = req.params;

  try {
    // ดึงข้อมูลใบจดหลัก
    const recordResult = await pool.query(
      `SELECT meter_record_id, dorm_id, meter_record_date
       FROM meter_records
       WHERE meter_record_id = $1 AND dorm_id = $2`,
      [recordId, dormId]
    );

    if (recordResult.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบใบจดมิเตอร์นี้' });
    }

    // ดึงข้อมูลห้องทั้งหมดในหอพัก
    const roomResult = await pool.query(
      `SELECT 
          r.room_id, r.floor_number, r.room_number, r.status_id,
          c.contract_id
        FROM rooms r
        LEFT JOIN contracts c 
          ON r.room_id = c.room_id 
          AND c.status = 'active'
        WHERE r.dorm_id = $1
        ORDER BY r.floor_number, r.room_number`,
      [dormId]
    );

    // ดึง readings สำหรับใบจดมิเตอร์นี้
    const readingsResult = await pool.query(
      `SELECT 
        room_id,
        water_prev,
        water_curr,
        electric_prev,
        electric_curr
      FROM meter_readings
      WHERE meter_record_id = $1`,
      [recordId]
    );

    // สร้าง map ของ readings
    const readingsMap = new Map();
    readingsResult.rows.forEach(reading => {
      readingsMap.set(reading.room_id, reading);
    });
    
    // กลุ่มตามชั้นและรวมข้อมูลทุกห้อง
    const grouped = {};
    roomResult.rows.forEach(r => {
      const floor = r.floor_number;
      if (!grouped[floor]) grouped[floor] = [];
      
      const reading = readingsMap.get(r.room_id) || {
        water_prev: 0,
        water_curr: 0,
        electric_prev: 0,
        electric_curr: 0
      };

      grouped[floor].push({
        room_id: r.room_id,
        room_number: r.room_number,
        status_id: r.status_id,
        tenant: r.contract_id ? 'มีผู้เช่า' : 'ว่าง',
        contract_id: r.contract_id || null,
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

    const readings = readingsResult.rows.map(r => ({
      room_id: r.room_id,
      water_curr: r.water_curr,
      electric_curr: r.electric_curr
    }));
  
    const recordDate = new Date(recordResult.rows[0].meter_record_date);
    const thaiDate = recordDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }); 

    // ส่งกลับ
    res.json({
      meter_record_id: recordResult.rows[0].meter_record_id,
      dorm_id: recordResult.rows[0].dorm_id,
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
    const check = await pool.query(
      `SELECT 1 FROM meter_records WHERE meter_record_id = $1 AND dorm_id = $2`,
      [recordId, dormId]
    );
    if (check.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบใบจดมิเตอร์นี้' });
    }

    await pool.query(
      `UPDATE meter_records SET meter_record_date = $1 WHERE meter_record_id = $2`,
      [meter_record_date, recordId]
    );

    await pool.query(
      `DELETE FROM meter_readings WHERE meter_record_id = $1`,
      [recordId]
    );

    // ✅ เพิ่ม function คำนวณ
    const unitUsed = (curr, prev) => {
      const c = parseInt(curr);
      const p = parseInt(prev);
      return !isNaN(c) && !isNaN(p) ? Math.max(0, c - p) : null;
    };

    // ✅ ดึงข้อมูล utility rates ล่าสุดสำหรับหอนี้
    const ratesResult = await pool.query(
      `SELECT water_rate, electricity_rate 
       FROM utility_rates 
       WHERE dorm_id = $1 
       ORDER BY start_date DESC 
       LIMIT 1`,
      [dormId]
    );
    
    const rates = ratesResult.rows[0] || { water_rate: 15, electricity_rate: 7 }; // ค่าเริ่มต้น

    const insertPromises = readings.map(r =>
      pool.query(
        `INSERT INTO meter_readings 
          (meter_record_id, room_id, 
           water_prev, water_curr, water_unit_used,
           electric_prev, electric_curr, electric_unit_used, month,
           water_rate, electricity_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          recordId,
          r.room_id,
          r.water_prev,
          r.water_curr,
          unitUsed(r.water_curr, r.water_prev),
          r.electric_prev,
          r.electric_curr,
          unitUsed(r.electric_curr, r.electric_prev),
          month,
          rates.water_rate,
          rates.electricity_rate
        ]
      )
    );
    await Promise.all(insertPromises);

    res.json({ message: 'อัปเดตใบจดมิเตอร์เรียบร้อยแล้ว' });

  } catch (err) {
    console.error('❌ Error updating meter record:', err.stack);
    console.error('📄 Error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail
    });
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการอัปเดตใบจดมิเตอร์',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.deleteMeterRecordById = async (req, res) => {
  const { dormId, recordId } = req.params;

  try {
    // ตรวจสอบว่า record นี้มีอยู่จริง
    const check = await pool.query(
      'SELECT * FROM meter_records WHERE meter_record_id = $1 AND dorm_id = $2',
      [recordId, dormId]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบใบจดมิเตอร์นี้' });
    }

    // ลบข้อมูล (จะลบใน meter_readings อัตโนมัติถ้ามี ON DELETE CASCADE)
    await pool.query(
      'DELETE FROM meter_records WHERE meter_record_id = $1 AND dorm_id = $2',
      [recordId, dormId]
    );

    res.json({ message: '✅ ลบใบจดมิเตอร์และข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('❌ Error deleting meter record:', err.stack);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบใบจดมิเตอร์' });
  }
};
