const prisma = require('../config/prisma');

//  เพิ่มหอพัก
exports.createDorm = async (req, res) => {
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

    // บันทึกข้อมูลหอพักหลัก พร้อม user_id
    const dormitory = await prisma.dormitories.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        image_filename,
        address: address || null,
        province: province || null,
        district: district || null,
        subdistrict: subdistrict || null,
        latitude: lat,
        longitude: lng,
        floors: floorsNum,
        total_rooms: totalRoomsNum,
        payment_due_day: paymentDueDayNum,
        late_fee_per_day: lateFeePerDayNum,
        auto_apply_late_fee: autoApplyLateFee,
        user_id
      }
    });

    const dormitoryId = dormitory.dorm_id;

    // สร้างห้องใน rooms ตาม floors_data
    if (floors_data) {
      const floorsArray = JSON.parse(floors_data);
      console.log('🏗️ กำลังสร้างชั้นและห้อง:', floorsArray);
      
      for (const floor of floorsArray) {
        console.log(`🏢 สร้างชั้น ${floor.floor_number} จำนวน ${floor.room_count} ห้อง`);

        // สร้างห้องจริงๆ ในตาราง rooms
        for (let roomIndex = 1; roomIndex <= floor.room_count; roomIndex++) {
          const roomNumber = `${floor.floor_number}${String(roomIndex).padStart(2, '0')}`;
          
          await prisma.rooms.create({
            data: {
              dorm_id: dormitoryId,
              floor_number: floor.floor_number,
              room_number: roomNumber,
              available: true
            }
          });
          
          console.log(`🏠 สร้างห้อง ${roomNumber}`);
        }
      }
    }
    
    res.status(201).json({
      message: 'เพิ่มหอพักสำเร็จ',
      dormitory: dormitory,
      dorm_id: dormitoryId
    });

  } catch (err) {
    console.error('Error creating dorm:', err);
    res.status(500).json({ error: 'Insert failed: ' + err.message });
  }
};

//  ดึงหอพักทั้งหมด (เฉพาะของ user ที่ login)
exports.getAllDorms = async (req, res) => {
  try {
    const user_id = req.user.user_id; // ใช้ user_id จาก JWT token
    const dormitories = await prisma.dormitories.findMany({
      where: {
        user_id: user_id
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(dormitories);
  } catch (err) {
    console.error("Error fetching dorms", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ดึงหอพักทั้งหมดพร้อมสถิติจากข้อมูลจริงในตาราง rooms (เฉพาะของ user ที่ login)
exports.getAllDormsWithStats = async (req, res) => {
  try {
    const user_id = req.user.user_id; // ใช้ user_id จาก JWT token
    const dormitories = await prisma.dormitories.findMany({
      where: {
        user_id: user_id
      },
      include: {
        rooms: {
          select: {
            floor_number: true,
            available: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // คำนวณสถิติของแต่ละหอพัก
    const dormsWithStats = dormitories.map(dorm => {
      const rooms = dorm.rooms;
      const actual_floors = rooms.length > 0 ? Math.max(...rooms.map(r => r.floor_number)) : 0;
      const actual_total_rooms = rooms.length;
      const available_rooms = rooms.filter(r => r.available).length;

      return {
        ...dorm,
        actual_floors,
        actual_total_rooms,
        available_rooms,
        rooms: undefined // ไม่ส่ง rooms data กลับไป
      };
    });
    
    res.json(dormsWithStats);
  } catch (err) {
    console.error("Error fetching dorms with stats", err);
    res.status(500).json({ error: "Server error" });
  }
};

//  ดึงหอพักตาม ID พร้อมข้อมูลชั้น (จากตาราง rooms) - ตรวจสอบ ownership
exports.getDormById = async (req, res) => {
  const dormId = parseInt(req.params.id);
  const user_id = req.user.user_id; // ใช้ user_id จาก JWT token
  
  try {
    // ดึงข้อมูลหอพักหลัก และตรวจสอบว่าเป็นของ user ที่ login
    const dormitory = await prisma.dormitories.findFirst({
      where: {
        dorm_id: dormId,
        user_id: user_id
      }
    });
    
    if (!dormitory)
      return res.status(404).json({ error: "Dorm not found or access denied" });

    // ดึงข้อมูลชั้นจากตาราง rooms
    const floorsData = await prisma.rooms.groupBy({
      by: ['floor_number'],
      where: {
        dorm_id: dormId
      },
      _count: {
        floor_number: true
      },
      orderBy: {
        floor_number: 'asc'
      }
    });

    const dormData = {
      ...dormitory,
      floors_data: floorsData.map(floor => ({
        floor_number: floor.floor_number,
        room_count: floor._count.floor_number
      }))
    };

    res.json(dormData);
  } catch (err) {
    console.error("Error fetching dorm by ID:", err);
    res.status(500).json({ error: "Server error" });
  }
};

//  แก้ไขหอพัก - ตรวจสอบ ownership
exports.updateDorm = async (req, res) => {
  const d = req.body || {};
  const imageFilename = req.files?.image?.[0]?.filename || d?.image_filename || null;
  const user_id = req.user.user_id; // ใช้ user_id จาก JWT token
  const dormId = parseInt(req.params.id);
  
  try {
    // ตรวจสอบว่าหอพักมีอยู่และเป็นของ user ที่ login
    const existingDorm = await prisma.dormitories.findFirst({
      where: {
        dorm_id: dormId,
        user_id: user_id
      }
    });

    if (!existingDorm)
      return res.status(404).json({ error: "Dorm not found or access denied" });

    // อัปเดตข้อมูล
    const updatedDorm = await prisma.dormitories.update({
      where: {
        dorm_id: dormId
      },
      data: {
        name: d.name || existingDorm.name,
        phone: d.phone || existingDorm.phone,
        email: d.email || existingDorm.email,
        image_filename: imageFilename || existingDorm.image_filename,
        address: d.address || existingDorm.address,
        province: d.province || existingDorm.province,
        district: d.district || existingDorm.district,
        subdistrict: d.subdistrict || existingDorm.subdistrict,
        latitude: d.latitude !== undefined ? parseFloat(d.latitude) : existingDorm.latitude,
        longitude: d.longitude !== undefined ? parseFloat(d.longitude) : existingDorm.longitude,
        floors: d.floors ? parseInt(d.floors) : existingDorm.floors,
        total_rooms: d.total_rooms ? parseInt(d.total_rooms) : existingDorm.total_rooms,
        payment_due_day: d.payment_due_day ? parseInt(d.payment_due_day) : existingDorm.payment_due_day,
        late_fee_per_day: d.late_fee_per_day ? parseFloat(d.late_fee_per_day) : existingDorm.late_fee_per_day,
        auto_apply_late_fee: d.auto_apply_late_fee !== undefined ? d.auto_apply_late_fee : existingDorm.auto_apply_late_fee,
        updated_at: new Date()
      }
    });

    res.json(updatedDorm);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Update failed" });
  }
};

