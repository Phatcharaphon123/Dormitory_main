const pool = require('../db');

// ➕ เพิ่มหอพัก
exports.createDorm = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      name, phone, email, address,
      province, district, subdistrict,
      latitude, longitude, floors, total_rooms, floors_data,
      payment_due_day, late_fee_per_day, auto_apply_late_fee
    } = req.body;
    const image_filename = req.file ? req.file.filename : null;
    const user_id = req.user.user_id; // ใช้ user_id จาก JWT token

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อหอพัก' });
    }

    // แปลงและตรวจสอบข้อมูลตัวเลข
    const floorsNum = parseInt(floors) || 1;
    const totalRoomsNum = parseInt(total_rooms) || 0;
    const paymentDueDayNum = payment_due_day && payment_due_day !== 'null' ? parseInt(payment_due_day) : null;
    const lateFeePerDayNum = parseFloat(late_fee_per_day) || 0;
    const autoApplyLateFee = auto_apply_late_fee === 'true' || auto_apply_late_fee === true;

    // ตรวจสอบพิกัด
    const lat = parseFloat(latitude) || 13.736717;
    const lng = parseFloat(longitude) || 100.523186;

    await client.query('BEGIN');

    // บันทึกข้อมูลหอพักหลัก พร้อม user_id
    const dormResult = await client.query(
      `INSERT INTO dormitories
        (name, phone, email, image_filename, address, province, district, subdistrict, latitude, longitude, floors, total_rooms, payment_due_day, late_fee_per_day, auto_apply_late_fee, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [name, phone || null, email || null, image_filename, address || null, province || null, district || null, subdistrict || null, lat, lng, floorsNum, totalRoomsNum, paymentDueDayNum, lateFeePerDayNum, autoApplyLateFee, user_id]
    );

    const dormitoryId = dormResult.rows[0].dorm_id;

    // สร้างห้องใน rooms ตาม floors_data
    if (floors_data) {
      const floorsArray = JSON.parse(floors_data);
      console.log('🏗️ กำลังสร้างชั้นและห้อง:', floorsArray);
      
      for (const floor of floorsArray) {
        console.log(`🏢 สร้างชั้น ${floor.floor_number} จำนวน ${floor.room_count} ห้อง`);

        // สร้างห้องจริงๆ ในตาราง rooms
        for (let roomIndex = 1; roomIndex <= floor.room_count; roomIndex++) {
          const roomNumber = `${floor.floor_number}${String(roomIndex).padStart(2, '0')}`;
          
          await client.query(
            `INSERT INTO rooms (dorm_id, floor_number, room_number, available)
             VALUES ($1, $2, $3, $4)`,
            [dormitoryId, floor.floor_number, roomNumber, true]
          );
          
          console.log(`🏠 สร้างห้อง ${roomNumber}`);
        }
      }
    }

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'เพิ่มหอพักสำเร็จ',
      dormitory: dormResult.rows[0],
      dorm_id: dormitoryId
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating dorm:', err);
    res.status(500).json({ error: 'Insert failed: ' + err.message });
  } finally {
    client.release();
  }
};

// 📥 ดึงหอพักทั้งหมด (เฉพาะของ user ที่ login)
exports.getAllDorms = async (req, res) => {
  try {
    const user_id = req.user.user_id; // ใช้ user_id จาก JWT token
    const result = await pool.query(
      "SELECT * FROM dormitories WHERE user_id = $1 ORDER BY created_at DESC", 
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching dorms", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 📥 ดึงหอพักทั้งหมดพร้อมสถิติจากข้อมูลจริงในตาราง rooms (เฉพาะของ user ที่ login)
exports.getAllDormsWithStats = async (req, res) => {
  try {
    const user_id = req.user.user_id; // ใช้ user_id จาก JWT token
    const result = await pool.query(`
      SELECT 
        d.*,
        COALESCE(MAX(r.floor_number), 0) as actual_floors,
        COUNT(r.room_id) as actual_total_rooms,
        COUNT(CASE WHEN r.available = true THEN 1 END) as available_rooms
      FROM dormitories d
      LEFT JOIN rooms r ON d.dorm_id = r.dorm_id
      WHERE d.user_id = $1
      GROUP BY d.dorm_id
      ORDER BY d.created_at DESC
    `, [user_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching dorms with stats", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 📥 ดึงหอพักตาม ID พร้อมข้อมูลชั้น (จากตาราง rooms) - ตรวจสอบ ownership
exports.getDormById = async (req, res) => {
  const dormId = req.params.id;
  const user_id = req.user.user_id; // ใช้ user_id จาก JWT token
  
  try {
    // ดึงข้อมูลหอพักหลัก และตรวจสอบว่าเป็นของ user ที่ login
    const dormResult = await pool.query(
      "SELECT * FROM dormitories WHERE dorm_id = $1 AND user_id = $2", 
      [dormId, user_id]
    );
    
    if (dormResult.rows.length === 0)
      return res.status(404).json({ error: "Dorm not found or access denied" });

    // ดึงข้อมูลชั้นจากตาราง rooms
    const floorsResult = await pool.query(`
      SELECT 
        floor_number,
        COUNT(*) as room_count
      FROM rooms 
      WHERE dorm_id = $1 
      GROUP BY floor_number 
      ORDER BY floor_number
    `, [dormId]);

    const dormData = {
      ...dormResult.rows[0],
      floors_data: floorsResult.rows.map(floor => ({
        floor_number: floor.floor_number,
        room_count: parseInt(floor.room_count)
      }))
    };

    res.json(dormData);
  } catch (err) {
    console.error("Error fetching dorm by ID:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ✏️ แก้ไขหอพัก - ตรวจสอบ ownership
exports.updateDorm = async (req, res) => {
  const d = req.body || {};
  const imageFilename = req.files?.image?.[0]?.filename || d?.image_filename || null;
  const user_id = req.user.user_id; // ใช้ user_id จาก JWT token
  
  try {
    const result = await pool.query(`
      UPDATE dormitories SET
        name = $1,
        phone = $2,
        email = $3,
        image_filename = COALESCE($4, image_filename),
        address = $5,
        province = $6,
        district = $7,
        subdistrict = $8,
        latitude = $9,
        longitude = $10,
        floors = COALESCE(CAST(NULLIF($11, '') AS INTEGER), floors),
        total_rooms = COALESCE(CAST(NULLIF($12, '') AS INTEGER), total_rooms),
        payment_due_day = COALESCE(CAST(NULLIF($13, '') AS INTEGER), payment_due_day),
        late_fee_per_day = COALESCE(CAST(NULLIF($14, '') AS NUMERIC), late_fee_per_day),
        auto_apply_late_fee = COALESCE($15, auto_apply_late_fee),
        updated_at = NOW()
      WHERE dorm_id = $16 AND user_id = $17
      RETURNING *
    `, [
      d.name,
      d.phone,
      d.email,
      imageFilename,
      d.address,
      d.province,
      d.district,
      d.subdistrict,
      d.latitude,
      d.longitude,
      d.floors ?? '',
      d.total_rooms ?? '',
      d.payment_due_day ?? '',
      d.late_fee_per_day ?? '',
      d.auto_apply_late_fee,
      req.params.id,
      user_id
    ]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Dorm not found or access denied" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Update failed" });
  }
};

