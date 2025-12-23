const pool = require('../db');

// ดึงข้อมูลมิเตอร์ทั้งหมดของหอพัก
const getDormMeters = async (req, res) => {
  const { dormId } = req.params;

  try {
    // ดึงข้อมูลห้องพร้อมผู้เช่า
    const roomsQuery = `
      SELECT 
        r.room_id,
        r.room_number,
        r.floor_number,
        r.available,
        COALESCE(t.first_name || ' ' || t.last_name, null) as tenant_name,
        c.status as contract_status
      FROM rooms r
      LEFT JOIN contracts c ON r.room_id = c.room_id AND c.status = 'active'
      LEFT JOIN tenants t ON c.tenant_id = t.tenant_id
      WHERE r.dorm_id = $1
      ORDER BY r.floor_number, r.room_number
    `;
    const roomsResult = await pool.query(roomsQuery, [dormId]);
    
    // ดึงข้อมูลมิเตอร์ไฟฟ้า
    const electricQuery = `
      SELECT me.room_id, me.electricity_meter_code, me.updated_at, me.installation_date
      FROM meter_electricity me
      JOIN rooms r ON me.room_id = r.room_id
      WHERE r.dorm_id = $1
    `;
    const electricResult = await pool.query(electricQuery, [dormId]);
    
    // ดึงข้อมูลมิเตอร์น้ำ
    const waterQuery = `
      SELECT mw.room_id, mw.water_meter_code, mw.updated_at, mw.installation_date
      FROM meter_water mw
      JOIN rooms r ON mw.room_id = r.room_id
      WHERE r.dorm_id = $1
    `;
    const waterResult = await pool.query(waterQuery, [dormId]);

    // จัดกลุ่มข้อมูลมิเตอร์ตาม room_id
    const electricMeters = {};
    electricResult.rows.forEach(meter => {
      electricMeters[meter.room_id] = {
        code: meter.electricity_meter_code,
        updatedAt: meter.updated_at,
        installationDate: meter.installation_date
      };
    });

    const waterMeters = {};
    waterResult.rows.forEach(meter => {
      waterMeters[meter.room_id] = {
        code: meter.water_meter_code,
        updatedAt: meter.updated_at,
        installationDate: meter.installation_date
      };
    });

    // รวมข้อมูลห้องกับมิเตอร์
    const roomsWithMeters = roomsResult.rows.map(room => ({
      roomId: room.room_id,
      roomNumber: room.room_number,
      floor: room.floor_number,
      available: room.available,
      tenant: room.tenant_name,
      contractStatus: room.contract_status,
      meters: {
        electric: electricMeters[room.room_id] ? {
          installed: true,
          code: electricMeters[room.room_id].code,
          updatedAt: electricMeters[room.room_id].updatedAt,
          installationDate: electricMeters[room.room_id].installationDate
        } : {
          installed: false
        },
        water: waterMeters[room.room_id] ? {
          installed: true,
          code: waterMeters[room.room_id].code,
          updatedAt: waterMeters[room.room_id].updatedAt,
          installationDate: waterMeters[room.room_id].installationDate
        } : {
          installed: false
        }
      }
    }));

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
const addElectricMeter = async (req, res) => {
  const { roomId, meterCode, installationDate, installationTime } = req.body;

  try {
    // รวมวันที่และเวลาติดตั้ง
    let installationDateTime = null;
    if (installationDate && installationTime) {
      installationDateTime = `${installationDate} ${installationTime}:00`;
    }

    // ตรวจสอบว่ามิเตอร์ใน room นี้มีอยู่แล้วหรือไม่
    const existingMeter = await pool.query(
      'SELECT * FROM meter_electricity WHERE room_id = $1',
      [roomId]
    );

    if (existingMeter.rows.length > 0) {
      // อัปเดตมิเตอร์ที่มีอยู่
      const updateQuery = installationDateTime ? 
        'UPDATE meter_electricity SET electricity_meter_code = $1, installation_date = $3, updated_at = CURRENT_TIMESTAMP WHERE room_id = $2 RETURNING *' :
        'UPDATE meter_electricity SET electricity_meter_code = $1, updated_at = CURRENT_TIMESTAMP WHERE room_id = $2 RETURNING *';
      
      const params = installationDateTime ? [meterCode, roomId, installationDateTime] : [meterCode, roomId];
      const result = await pool.query(updateQuery, params);
      
      res.json({ 
        message: 'อัปเดตมิเตอร์ไฟฟ้าสำเร็จ',
        meter: result.rows[0]
      });
    } else {
      // เพิ่มมิเตอร์ใหม่
      const insertQuery = installationDateTime ?
        'INSERT INTO meter_electricity (room_id, electricity_meter_code, installation_date) VALUES ($1, $2, $3) RETURNING *' :
        'INSERT INTO meter_electricity (room_id, electricity_meter_code) VALUES ($1, $2) RETURNING *';
      
      const params = installationDateTime ? [roomId, meterCode, installationDateTime] : [roomId, meterCode];
      const result = await pool.query(insertQuery, params);
      
      res.json({ 
        message: 'เพิ่มมิเตอร์ไฟฟ้าสำเร็จ',
        meter: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Error adding electric meter:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มมิเตอร์ไฟฟ้า' });
  }
};

// เพิ่มมิเตอร์น้ำ
const addWaterMeter = async (req, res) => {
  const { roomId, meterCode, installationDate, installationTime } = req.body;

  try {
    // รวมวันที่และเวลาติดตั้ง
    let installationDateTime = null;
    if (installationDate && installationTime) {
      installationDateTime = `${installationDate} ${installationTime}:00`;
    }

    // ตรวจสอบว่ามิเตอร์ใน room นี้มีอยู่แล้วหรือไม่
    const existingMeter = await pool.query(
      'SELECT * FROM meter_water WHERE room_id = $1',
      [roomId]
    );

    if (existingMeter.rows.length > 0) {
      // อัปเดตมิเตอร์ที่มีอยู่
      const updateQuery = installationDateTime ? 
        'UPDATE meter_water SET water_meter_code = $1, installation_date = $3, updated_at = CURRENT_TIMESTAMP WHERE room_id = $2 RETURNING *' :
        'UPDATE meter_water SET water_meter_code = $1, updated_at = CURRENT_TIMESTAMP WHERE room_id = $2 RETURNING *';
      
      const params = installationDateTime ? [meterCode, roomId, installationDateTime] : [meterCode, roomId];
      const result = await pool.query(updateQuery, params);
      
      res.json({ 
        message: 'อัปเดตมิเตอร์น้ำสำเร็จ',
        meter: result.rows[0]
      });
    } else {
      // เพิ่มมิเตอร์ใหม่
      const insertQuery = installationDateTime ?
        'INSERT INTO meter_water (room_id, water_meter_code, installation_date) VALUES ($1, $2, $3) RETURNING *' :
        'INSERT INTO meter_water (room_id, water_meter_code) VALUES ($1, $2) RETURNING *';
      
      const params = installationDateTime ? [roomId, meterCode, installationDateTime] : [roomId, meterCode];
      const result = await pool.query(insertQuery, params);
      
      res.json({ 
        message: 'เพิ่มมิเตอร์น้ำสำเร็จ',
        meter: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Error adding water meter:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มมิเตอร์น้ำ' });
  }
};

// ลบมิเตอร์ไฟฟ้า
const removeElectricMeter = async (req, res) => {
  const { roomId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM meter_electricity WHERE room_id = $1 RETURNING *',
      [roomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบมิเตอร์ไฟฟ้าในห้องนี้' });
    }

    res.json({ message: 'ลบมิเตอร์ไฟฟ้าสำเร็จ' });
  } catch (error) {
    console.error('Error removing electric meter:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบมิเตอร์ไฟฟ้า' });
  }
};

// ลบมิเตอร์น้ำ
const removeWaterMeter = async (req, res) => {
  const { roomId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM meter_water WHERE room_id = $1 RETURNING *',
      [roomId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบมิเตอร์น้ำในห้องนี้' });
    }

    res.json({ message: 'ลบมิเตอร์น้ำสำเร็จ' });
  } catch (error) {
    console.error('Error removing water meter:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบมิเตอร์น้ำ' });
  }
};

module.exports = {
  getDormMeters,
  addElectricMeter,
  addWaterMeter,
  removeElectricMeter,
  removeWaterMeter
};
