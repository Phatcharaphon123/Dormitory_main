const pool = require('../db');

const createDormWithRooms = async (req, res) => {
  const { dorm_name, total_floors, rooms_per_floor } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const dormRes = await client.query(
      'INSERT INTO dormitories (dorm_name, total_floors) VALUES ($1, $2) RETURNING dorm_id',
      [dorm_name, total_floors]
    );
    const dorm_id = dormRes.rows[0].dorm_id;

    for (let i = 0; i < rooms_per_floor.length; i++) {
      const roomCount = rooms_per_floor[i];
      if (roomCount > 0) {
        await client.query(
          'INSERT INTO dorm_rooms (dorm_id, floor_number, room_count) VALUES ($1, $2, $3)',
          [dorm_id, i + 1, roomCount]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'เพิ่มหอพักสำเร็จ', dorm_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  } finally {
    client.release();
  }
};

// GET: /dorm/getDorm
const getAllDorms = async (req, res) => {
  try {
    const result = await pool.query('SELECT dorm_id, dorm_name FROM dormitories');
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching dorms:", error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก' });
  }
};

// GET: /dorm/getAllRoom
const getAllRoom = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dorm_id, floor_number, room_count
      FROM dorm_rooms
      ORDER BY dorm_id, floor_number
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching rooms:", error);
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูลห้องได้' });
  }
};

// GET: /dorm/getAllRoom/:dormId
const getRoomsByDormId = async (req, res) => {
  const dormId = parseInt(req.params.dormId);
  if (isNaN(dormId)) {
    return res.status(400).json({ error: 'รหัสหอพักไม่ถูกต้อง' });
  }

  try {
    const result = await pool.query(`
      SELECT floor_number, room_count
      FROM dorm_rooms
      WHERE dorm_id = $1
      ORDER BY floor_number
    `, [dormId]);

    const floors = result.rows.map(row => ({
      floor_number: row.floor_number,
      rooms: Array.from({ length: row.room_count }, (_, i) => `ห้อง ${row.floor_number}0${i + 1}`)
    }));

    res.json(floors);
  } catch (error) {
    console.error('Error fetching rooms for dorm:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้อง' });
  }
};

// GET: /dorm/getDorm/:dormId
  const getDormById = async (req, res) => {
    const dormId = parseInt(req.params.dormId);
    if (isNaN(dormId)) {
      return res.status(400).json({ error: 'รหัสหอพักไม่ถูกต้อง' });
    }

    try {
      const dormResult = await pool.query(
        'SELECT dorm_id, dorm_name, total_floors FROM dormitories WHERE dorm_id = $1',
        [dormId]
      );

      if (dormResult.rows.length === 0) {
        return res.status(404).json({ error: 'ไม่พบหอพักที่ระบุ' });
      }

      const dorm = dormResult.rows[0];

      // ดึง rooms_per_floor จาก dorm_rooms
      const roomsResult = await pool.query(
        'SELECT floor_number, room_count FROM dorm_rooms WHERE dorm_id = $1 ORDER BY floor_number',
        [dormId]
      );

      const rooms_per_floor = roomsResult.rows.map(row => row.room_count);

      res.json({
        dorm_id: dorm.dorm_id,
        dorm_name: dorm.dorm_name,
        total_floors: dorm.total_floors,
        rooms_per_floor,
      });
    } catch (error) {
      console.error('Error fetching dorm by ID:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลหอพัก' });
    }
  };

const updateDorm = async (req, res) => {
  const dormId = req.params.dormId;
  const { dorm_name, floor_number, room_count } = req.body;

  // Validation
  if (!dorm_name || !Array.isArray(room_count) || room_count.length !== floor_number) {
    return res.status(400).json({ error: "ข้อมูลไม่ครบหรือรูปแบบผิด" });
  }

  try {
    // อัปเดตชื่อหอพัก
    await pool.query(
      `UPDATE dormitories
       SET dorm_name = $1, total_floors = $2
       WHERE dorm_id = $3`,
      [dorm_name, floor_number, dormId]
    );

    // ลบห้องเดิมทั้งหมด
    await pool.query(`DELETE FROM dorm_rooms WHERE dorm_id = $1`, [dormId]);

    // เพิ่มห้องใหม่
    for (let i = 0; i < room_count.length; i++) {
      const floor = i + 1;
      const count = room_count[i];

      await pool.query(
        `INSERT INTO dorm_rooms (dorm_id, floor_number, room_count)
         VALUES ($1, $2, $3)`,
        [dormId, floor, count]
      );
    }

    res.status(200).json({ message: "อัปเดตหอพักสำเร็จแล้ว" });

  } catch (error) {
    console.error("❌ SQL Error:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดต" });
  }
};

module.exports = {
  createDormWithRooms,
  getAllDorms,
  getAllRoom,
  getRoomsByDormId,
  getDormById,
  updateDorm
};

