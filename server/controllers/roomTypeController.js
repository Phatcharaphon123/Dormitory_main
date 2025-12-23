const pool = require('../db');

// 📌 ดึงประเภทห้องทั้งหมด (รวมรูป) ตาม dormId
const getAllRoomTypes = async (req, res) => {
  try {
    const dormId = req.params.dormId;
    const result = await pool.query(`
      SELECT rt.*, 
        COALESCE(
          json_agg(rti.*) FILTER (WHERE rti.room_type_image_id IS NOT NULL), 
          '[]'
        ) AS images
      FROM room_types rt
      LEFT JOIN room_type_images rti ON rt.room_type_id = rti.room_type_id
      WHERE rt.dorm_id = $1
      GROUP BY rt.room_type_id
      ORDER BY rt.room_type_id DESC
    `, [dormId]);

    res.json(result.rows);
  } catch (err) {
    console.error("getAllRoomTypes error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

  // 📌 ดึงประเภทห้องเดียว
  const getRoomTypeById = async (req, res) => {
  try {
    const dormId = req.params.dormId;
    const roomTypeId = req.params.id;
    const result = await pool.query(`
      SELECT rt.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'room_type_image_id', rti.room_type_image_id,
              'image_url', rti.image_url
            )
          ) FILTER (WHERE rti.room_type_image_id IS NOT NULL), 
          '[]'
        ) AS images
      FROM room_types rt
      LEFT JOIN room_type_images rti ON rt.room_type_id = rti.room_type_id
      WHERE rt.dorm_id = $1 AND rt.room_type_id = $2
      GROUP BY rt.room_type_id
    `, [dormId, roomTypeId]);

    if (result.rows.length === 0) {
      console.log('❌ Room type not found for ID:', roomTypeId);
      return res.status(404).json({ error: "Room type not found" });
    }

    res.json(result.rows[0]);

    } catch (err) {
      console.error("getRoomTypeById error:", err);
      res.status(500).json({ error: "Internal Server Error: " + err.message });
    }
  };

// 📌 สร้างประเภทห้องใหม่
const createRoomType = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      name, monthly_rent, security_deposit, prepaid_amount, amenities
    } = req.body;
    const dormId = req.params.dormId;

    console.log("=== CREATE ROOM TYPE DEBUG ===");
    console.log("createRoomType - Body:", req.body);
    console.log("createRoomType - Files:", req.files);
    console.log("createRoomType - Files length:", req.files ? req.files.length : 0);
    console.log("createRoomType - DormId:", dormId);

    // จัดการ amenities ให้ปลอดภัย
    let amenitiesData = [];
    try {
      if (typeof amenities === 'string') {
        amenitiesData = JSON.parse(amenities);
      } else if (Array.isArray(amenities)) {
        amenitiesData = amenities;
      }
    } catch (error) {
      console.error('Error parsing amenities:', error);
      amenitiesData = [];
    }

    await client.query("BEGIN");

    const insertRoom = await client.query(`
      INSERT INTO room_types 
      (room_type_name, monthly_rent, security_deposit, prepaid_amount, amenities, dorm_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING room_type_id
    `, [
      name, 
      parseFloat(monthly_rent) || 0, 
      parseFloat(security_deposit) || 0, 
      parseFloat(prepaid_amount) || 0,
      JSON.stringify(amenitiesData), 
      dormId
    ]);

    const roomTypeId = insertRoom.rows[0].room_type_id;

    // Save uploaded images
    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await client.query(`
          INSERT INTO room_type_images (room_type_id, image_url)
          VALUES ($1, $2)
        `, [roomTypeId, file.filename]);
        images.push({ image_url: file.filename });
      }
    }

    await client.query("COMMIT");

    res.status(201).json({ 
      message: "Room type created successfully", 
      id: roomTypeId,
      room_type: {
        ...insertRoom.rows[0],
        amenities: amenitiesData,
        images
      }
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createRoomType error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  } finally {
    client.release();
  }
};

// 📌 แก้ไขประเภทห้อง
const updateRoomType = async (req, res) => {
  const client = await pool.connect();
  try {
    const roomTypeId = req.params.id;
    const {
      name, room_size, monthly_rent, security_deposit, prepaid_amount, amenities, existing_images
    } = req.body;

    console.log("updateRoomType - Body:", req.body);
    console.log("updateRoomType - Files:", req.files);

    // จัดการ amenities ให้ปลอดภัย
    let amenitiesData = [];
    try {
      if (typeof amenities === 'string') {
        amenitiesData = JSON.parse(amenities);
      } else if (Array.isArray(amenities)) {
        amenitiesData = amenities;
      }
    } catch (error) {
      console.error('Error parsing amenities:', error);
      amenitiesData = [];
    }

    await client.query("BEGIN");

    await client.query(`
      UPDATE room_types SET
        room_type_name = $1,
        monthly_rent = $2,
        security_deposit = $3,
        prepaid_amount = $4,
        amenities = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE room_type_id = $6
    `, [
      name, 
      parseFloat(monthly_rent) || 0, 
      parseFloat(security_deposit) || 0, 
      parseFloat(prepaid_amount) || 0,
      JSON.stringify(amenitiesData), 
      roomTypeId
    ]);

    // จัดการรูปภาพ
    // ลบรูปเดิมทั้งหมด
    await client.query(`DELETE FROM room_type_images WHERE room_type_id = $1`, [roomTypeId]);
    
    // เพิ่มรูปเก่าที่ต้องการเก็บไว้
    if (existing_images) {
      const existingImagesList = JSON.parse(existing_images);
      for (const imageUrl of existingImagesList) {
        await client.query(`
          INSERT INTO room_type_images (room_type_id, image_url)
          VALUES ($1, $2)
        `, [roomTypeId, imageUrl]);
      }
    }
    
    // เพิ่มรูปใหม่
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await client.query(`
          INSERT INTO room_type_images (room_type_id, image_url)
          VALUES ($1, $2)
        `, [roomTypeId, file.filename]);
      }
    }

    await client.query("COMMIT");

    res.json({ message: "Room type updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("updateRoomType error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  } finally {
    client.release();
  }
};

// 📌 ลบประเภทห้อง
const deleteRoomType = async (req, res) => {
  try {
    const roomTypeId = req.params.id;

    // ตรวจว่ามีห้องที่ยังอ้างถึง room_type_id นี้อยู่ไหม
    const checkRooms = await pool.query(
      `SELECT COUNT(*) FROM rooms WHERE room_type_id = $1`,
      [roomTypeId]
    );

    const roomCount = parseInt(checkRooms.rows[0].count, 10);
    if (roomCount > 0) {
      return res.status(400).json({
        error: `ไม่สามารถลบประเภทห้องได้ เนื่องจากมีห้อง ${roomCount} ห้องที่ยังใช้งานอยู่`,
      });
    }

    // ถ้าไม่มีห้องที่ใช้งานอยู่ → ลบได้
    await pool.query(`DELETE FROM room_types WHERE room_type_id = $1`, [roomTypeId]);
    res.json({ message: "Room type deleted" });

  } catch (err) {
    console.error("deleteRoomType error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getAllRoomTypes,
  getRoomTypeById,
  createRoomType,
  updateRoomType,
  deleteRoomType
};
