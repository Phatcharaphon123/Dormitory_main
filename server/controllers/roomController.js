const pool = require('../db');

// 📌 ดึงข้อมูลชั้นของหอพัก (จากตาราง rooms)
const getDormFloors = async (req, res) => {
  try {
    const dormId = req.params.dormId;
    const result = await pool.query(`
      SELECT 
        floor_number,
        COUNT(*) as room_count
      FROM rooms 
      WHERE dorm_id = $1 
      GROUP BY floor_number 
      ORDER BY floor_number
    `, [dormId]);
    
    const floors = result.rows.map(floor => ({
      floor_number: floor.floor_number,
      room_count: parseInt(floor.room_count)
    }));
    
    res.json(floors);
  } catch (err) {
    console.error("getDormFloors error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 📌 อัปเดตข้อมูลชั้น (ไม่ต้องทำอะไรเพราะข้อมูลอยู่ใน rooms แล้ว)
const updateDormFloors = async (req, res) => {
  try {
    // ข้อมูลชั้นจะถูกอัปเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลงห้องในตาราง rooms
    res.json({ message: 'ข้อมูลชั้นจะอัปเดตอัตโนมัติตามข้อมูลห้อง' });
  } catch (err) {
    console.error('updateDormFloors error:', err);
    res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};

// 📌 ดึงข้อมูลห้องทั้งหมดของหอพัก
const getDormRooms = async (req, res) => {
  try {
    const dormId = req.params.dormId;
    const result = await pool.query(
      "SELECT * FROM rooms WHERE dorm_id = $1 ORDER BY floor_number, room_number",
      [dormId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getDormRooms error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 📌 ดึงข้อมูลห้องจัดกลุ่มตามชั้น (รองรับชั้นที่ไม่มีห้อง)
const getDormRoomsByFloor = async (req, res) => {
  try {
    const dormId = req.params.dormId;
    
    // ดึงข้อมูลห้องทั้งหมด พร้อมชื่อผู้เช่า (active)
    const roomsResult = await pool.query(
      `SELECT r.*, t.first_name, t.last_name
       FROM rooms r
       LEFT JOIN contracts c ON c.room_id = r.room_id AND c.status = 'active'
       LEFT JOIN tenants t ON c.tenant_id = t.tenant_id
       WHERE r.dorm_id = $1
       ORDER BY r.floor_number, r.room_number`,
      [dormId]
    );

    // ดึงข้อมูลชั้นทั้งหมดที่เคยมี (รวมถึงชั้นที่ไม่มีห้อง)
    const floorsResult = await pool.query(`
      SELECT DISTINCT floor_number 
      FROM (
        SELECT floor_number FROM rooms WHERE dorm_id = $1
        UNION
        SELECT generate_series(1, COALESCE(MAX(floor_number), 1)) as floor_number
        FROM rooms WHERE dorm_id = $1
      ) floors
      ORDER BY floor_number
    `, [dormId]);

    // จัดกลุ่มตามชั้น
    const roomsByFloor = {};

    // สร้างชั้นทั้งหมดก่อน (รวมชั้นที่ไม่มีห้อง)
    floorsResult.rows.forEach(floorRow => {
      roomsByFloor[floorRow.floor_number] = {
        floorNumber: floorRow.floor_number,
        rooms: []
      };
    });

    // เพิ่มห้องเข้าไปในชั้นที่มี (พร้อมชื่อผู้เช่า)
    roomsResult.rows.forEach(room => {
      roomsByFloor[room.floor_number].rooms.push({
        room_id: room.room_id,
        number: room.room_number,
        available: room.available,
        room_type_id: room.room_type_id,
        first_name: room.first_name,
        last_name: room.last_name
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
const updateDormRooms = async (req, res) => {
  const client = await pool.connect();
  try {
    const dormId = req.params.dormId;
    const { floors } = req.body;

    console.log('🔧 updateDormRooms called:', {
      dormId,
      floorsCount: floors?.length,
      requestBody: JSON.stringify(req.body, null, 2)
    });

    if (!floors || !Array.isArray(floors)) {
      throw new Error('floors array is required');
    }

    await client.query('BEGIN');

    // � Step 1: Get all current room numbers from frontend
    const frontendRoomNumbers = [];
    floors.forEach(floor => {
      floor.rooms.forEach(room => {
        frontendRoomNumbers.push(room.number);
      });
    });

    console.log('🔍 Frontend room numbers:', frontendRoomNumbers);

    // �️ Step 2: Check if rooms to be deleted have any data (contracts, meter readings, invoices)
    let roomsToDelete = [];
    if (frontendRoomNumbers.length > 0) {
      const checkResult = await client.query(
        `SELECT DISTINCT r.room_id, r.room_number 
         FROM rooms r
         WHERE r.dorm_id = $1 AND r.room_number NOT IN (${frontendRoomNumbers.map((_, i) => `$${i + 2}`).join(',')})`,
        [dormId, ...frontendRoomNumbers]
      );
      roomsToDelete = checkResult.rows;
    } else {
      // If no rooms in frontend, get all rooms for this dorm
      const checkResult = await client.query('SELECT room_id, room_number FROM rooms WHERE dorm_id = $1', [dormId]);
      roomsToDelete = checkResult.rows;
    }

    if (roomsToDelete.length > 0) {
      const roomIds = roomsToDelete.map(r => r.room_id);
      
      // Check for contracts
      const contractCheck = await client.query(
        `SELECT COUNT(*) as count FROM contracts WHERE room_id = ANY($1)`,
        [roomIds]
      );
      
      // Check for meter readings
      const meterCheck = await client.query(
        `SELECT COUNT(*) as count FROM meter_readings WHERE room_id = ANY($1)`,
        [roomIds]
      );
      
      // Check for invoice receipts
      const invoiceCheck = await client.query(
        `SELECT COUNT(*) as count FROM invoice_receipts WHERE room_id = ANY($1)`,
        [roomIds]
      );

      const hasContracts = parseInt(contractCheck.rows[0].count) > 0;
      const hasMeterReadings = parseInt(meterCheck.rows[0].count) > 0;
      const hasInvoices = parseInt(invoiceCheck.rows[0].count) > 0;

      if (hasContracts || hasMeterReadings || hasInvoices) {
        const roomsWithData = roomsToDelete.map(r => r.room_number).join(', ');
        throw new Error(`ไม่สามารถลบห้อง ${roomsWithData} ได้ เนื่องจากมีข้อมูลการเช่า การอ่านมิเตอร์ หรือใบแจ้งหนี้อยู่`);
      }

      // Safe to delete - no data found
      const deleteResult = await client.query(
        `DELETE FROM rooms WHERE room_id = ANY($1)`,
        [roomIds]
      );
      const deletedRoomNumbers = roomsToDelete.map(r => r.room_number).join(', ');
      console.log(`🗑️ Safely deleted ${deleteResult.rowCount} rooms: ${deletedRoomNumbers}`);
    }

    // 🏠 Step 3: Upsert all rooms from frontend
    for (const floor of floors) {
      console.log(`🏢 Processing floor ${floor.floorNumber}:`, {
        roomsCount: floor.rooms?.length,
        rooms: floor.rooms?.map(r => ({ number: r.number, type_id: r.room_type_id }))
      });

      for (const room of floor.rooms) {
        console.log(`🏠 Upserting room:`, {
          dormId,
          floorNumber: floor.floorNumber,
          roomNumber: room.number,
          available: room.available,
          room_type_id: room.room_type_id
        });
        
        // Try to update existing room first
        const updateResult = await client.query(
          `UPDATE rooms 
           SET available = $4, room_type_id = $5, floor_number = $2
           WHERE dorm_id = $1 AND room_number = $3`,
          [dormId, floor.floorNumber, room.number, room.available, room.room_type_id || null]
        );

        // If no room was updated, insert new one
        if (updateResult.rowCount === 0) {
          await client.query(
            `INSERT INTO rooms (dorm_id, floor_number, room_number, available, room_type_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [dormId, floor.floorNumber, room.number, room.available, room.room_type_id || null]
          );
          console.log(`✅ Inserted new room ${room.number}`);
        } else {
          console.log(`✅ Updated existing room ${room.number}`);
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ updateDormRooms success');
    res.json({ message: 'อัปเดตข้อมูลห้องสำเร็จ' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ updateDormRooms error:', err);
    res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  } finally {
    client.release();
  }
};

// 📌 อัปเดตห้องเดียว
const updateSingleRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { room_number, available, room_type_id } = req.body;
    
    const result = await pool.query(
      `UPDATE rooms SET 
        room_number = $1, 
        available = $2,
        room_type_id = $3,
        updated_at = NOW() 
      WHERE room_id = $4 
      RETURNING *`,
      [room_number, available, room_type_id, roomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบห้องที่ต้องการแก้ไข" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateSingleRoom error:', err);
    if (err.code === '23505') { // unique constraint violation
      res.status(400).json({ error: "หมายเลขห้องนี้ซ้ำกับห้องอื่นแล้ว" });
    } else {
      res.status(500).json({ error: 'Internal Server Error: ' + err.message });
    }
  }
};

// 📌 อัปเดตเฉพาะห้องที่เลือกเท่านั้น
const bulkUpdateRooms = async (req, res) => {
  const client = await pool.connect();
  try {
    const dormId = req.params.dormId;
    const { floors } = req.body;

    await client.query("BEGIN");

    for (const floor of floors) {
      for (const room of floor.rooms) {
        await client.query(
          `UPDATE rooms SET 
            available = $1, 
            room_type_id = $2,
            updated_at = NOW()
           WHERE dorm_id = $3 AND floor_number = $4 AND room_number = $5`,
          [
            room.available,
            room.room_type_id ?? null,
            dormId,
            floor.floorNumber,
            room.number,
          ]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: "อัปเดตห้องที่เลือกสำเร็จ" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("bulkUpdateRooms error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  } finally {
    client.release();
  }
};

// 📌 ลบห้องหลายห้อง
const deleteMultipleRooms = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { roomIds } = req.body; // array of room IDs
    
    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({ error: "กรุณาระบุรายการ ID ของห้องที่ต้องการลบ" });
    }

    await client.query('BEGIN');

    const placeholders = roomIds.map((_, index) => `$${index + 1}`).join(',');
    const result = await client.query(
      `DELETE FROM rooms WHERE room_id IN (${placeholders}) RETURNING *`,
      roomIds
    );

    await client.query('COMMIT');
    
    res.json({ 
      message: `ลบห้องสำเร็จ ${result.rows.length} ห้อง`,
      deletedRooms: result.rows
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('deleteMultipleRooms error:', err);
    res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  } finally {
    client.release();
  }
};

// 📌 ดึงข้อมูลห้องรายละเอียดพร้อมผู้เช่าและมิเตอร์
const getRoomDetail = async (req, res) => {
  try {
    const { dormId, roomId } = req.params;
    
    // ดึงข้อมูลห้องพร้อมผู้เช่าและอัตราค่าใช้จ่าย
    const roomResult = await pool.query(`
      SELECT 
        r.room_id, r.room_number, r.floor_number, r.status_id,
        t.first_name, t.last_name, t.phone_number,
        c.contract_id, c.status as contract_status,
        rt.room_type_name, rt.monthly_rent,
        ur.water_rate, ur.electricity_rate
      FROM rooms r
      LEFT JOIN contracts c ON r.room_id = c.room_id AND c.status = 'active'
      LEFT JOIN tenants t ON c.tenant_id = t.tenant_id
      LEFT JOIN room_types rt ON r.room_type_id = rt.room_type_id
      LEFT JOIN utility_rates ur ON r.dorm_id = ur.dorm_id
      WHERE r.dorm_id = $1 AND r.room_id = $2
      ORDER BY ur.start_date DESC
      LIMIT 1
    `, [dormId, roomId]);

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลห้อง' });
    }

    const room = roomResult.rows[0];

    // ดึงข้อมูลมิเตอร์ล่าสุด 2 ครั้ง เพื่อคำนวณการใช้งาน
    const meterResult = await pool.query(`
      SELECT 
        mr.water_curr,
        mr.electric_curr,
        mrd.meter_record_date,
        LAG(mr.water_curr) OVER (ORDER BY mrd.meter_record_date) as water_prev,
        LAG(mr.electric_curr) OVER (ORDER BY mrd.meter_record_date) as electric_prev
      FROM meter_readings mr
      JOIN meter_records mrd ON mr.meter_record_id = mrd.meter_record_id
      WHERE mr.room_id = $1
      ORDER BY mrd.meter_record_date DESC
      LIMIT 2
    `, [roomId]);

    let meterData = {
      current_water: 0,
      current_electric: 0,
      previous_water: 0,
      previous_electric: 0,
      meter_record_date: null
    };

    if (meterResult.rows.length > 0) {
      const latest = meterResult.rows[0];
      meterData = {
        current_water: latest.water_curr || 0,
        current_electric: latest.electric_curr || 0,
        previous_water: latest.water_prev || 0,
        previous_electric: latest.electric_prev || 0,
        meter_record_date: latest.meter_record_date
      };
    }

    // คำนวณการใช้งาน
    const waterUsage = Math.max(0, meterData.current_water - meterData.previous_water);
    const electricUsage = Math.max(0, meterData.current_electric - meterData.previous_electric);

    // รวมข้อมูล
    const roomDetail = {
      room_id: room.room_id,
      room_number: room.room_number,
      floor_number: room.floor_number,
      tenant_name: room.first_name && room.last_name 
        ? `${room.first_name} ${room.last_name}` 
        : 'ไม่มีผู้เช่า',
      phone_number: room.phone_number || null,
      status: room.contract_id ? 'มีผู้เช่า' : 'ว่าง',
      contract_id: room.contract_id,
      room_type: room.room_type_name || '',
      monthly_rent: room.monthly_rent || 0,
      water_rate: room.water_rate || 15,
      electricity_rate: room.electricity_rate || 8,
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
const checkRoomsData = async (req, res) => {
  try {
    const dormId = req.params.dormId;
    
    const result = await pool.query(`
      SELECT 
        r.room_id,
        r.room_number,
        r.floor_number,
        CASE WHEN (
          EXISTS(SELECT 1 FROM contracts WHERE room_id = r.room_id) OR
          EXISTS(SELECT 1 FROM meter_readings WHERE room_id = r.room_id) OR
          EXISTS(SELECT 1 FROM invoice_receipts WHERE room_id = r.room_id)
        ) THEN true ELSE false END as has_data
      FROM rooms r
      WHERE r.dorm_id = $1
      ORDER BY r.floor_number, r.room_number
    `, [dormId]);

    const roomsData = {};
    result.rows.forEach(row => {
      roomsData[row.room_number] = {
        room_id: row.room_id,
        has_data: row.has_data
      };
    });

    res.json(roomsData);
  } catch (err) {
    console.error('checkRoomsData error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getDormFloors,
  updateDormFloors,
  getDormRooms,
  getDormRoomsByFloor,
  getRoomDetail,
  checkRoomsData,
  updateDormRooms,
  updateSingleRoom,
  bulkUpdateRooms,
  deleteMultipleRooms
};
