const prisma = require('../config/prisma');

//  ดึงประเภทห้องทั้งหมด (รวมรูป) ตาม dormId
exports.getAllRoomTypes = async (req, res) => {
  try {
    const dormId = parseInt(req.params.dormId);
    const roomTypes = await prisma.room_types.findMany({
      where: {
        dorm_id: dormId
      },
      include: {
        room_type_images: true
      },
      orderBy: {
        room_type_id: 'desc'
      }
    });
    // แปลงข้อมูลให้ตรงกับ format เดิม
    const formattedRoomTypes = roomTypes.map(roomType => ({
      ...roomType,
      images: roomType.room_type_images || []
    }));
    res.json(formattedRoomTypes);
  } catch (err) {
    console.error("getAllRoomTypes error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//  ดึงประเภทห้องเดียว
exports.getRoomTypeById = async (req, res) => {
  try {
    const dormId = parseInt(req.params.dormId);
    const roomTypeId = parseInt(req.params.id);
    const roomType = await prisma.room_types.findFirst({
      where: {
        dorm_id: dormId,
        room_type_id: roomTypeId
      },
      include: {
        room_type_images: {
          select: {
            room_type_image_id: true,
            image_url: true
          }
        }
      }
    });

    if (!roomType) {
      console.log('❌ Room type not found for ID:', roomTypeId);
      return res.status(404).json({ error: "Room type not found" });
    }

    // แปลงข้อมูลให้ตรงกับ format เดิม
    const formattedRoomType = {
      ...roomType,
      images: roomType.room_type_images || []
    };

    res.json(formattedRoomType);

    } catch (err) {
      console.error("getRoomTypeById error:", err);
      res.status(500).json({ error: "Internal Server Error: " + err.message });
    }
};

//  สร้างประเภทห้องใหม่
exports.createRoomType = async (req, res) => {
  try {
    const {
      name, monthly_rent, security_deposit, prepaid_amount, amenities
    } = req.body;
    const dormId = parseInt(req.params.dormId);

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

    // สร้างประเภทห้อง
    const roomType = await prisma.room_types.create({
      data: {
        room_type_name: name,
        monthly_rent: parseFloat(monthly_rent) || 0,
        security_deposit: parseFloat(security_deposit) || 0,
        prepaid_amount: parseFloat(prepaid_amount) || 0,
        amenities: JSON.stringify(amenitiesData),
        dorm_id: dormId
      }
    });

    const roomTypeId = roomType.room_type_id;

    // บันทึกรูปภาพที่อัปโหลด
    let images = [];
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map(file => 
        prisma.room_type_images.create({
          data: {
            room_type_id: roomTypeId,
            image_url: file.filename
          }
        })
      );
      const createdImages = await Promise.all(imagePromises);
      images = createdImages.map(img => ({ image_url: img.image_url }));
    }
    res.status(201).json({ 
      message: "Room type created successfully", 
      id: roomTypeId,
      room_type: {
        ...roomType,
        amenities: amenitiesData,
        images
      }
    });
  } catch (err) {
    console.error("createRoomType error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
}; 

//  แก้ไขประเภทห้อง
exports.updateRoomType = async (req, res) => {
  try {
    const roomTypeId = parseInt(req.params.id);
    const {
      name, room_size, monthly_rent, security_deposit, prepaid_amount, amenities, existing_images
    } = req.body;
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
    // อัปเดตข้อมูลประเภทห้อง
    await prisma.room_types.update({
      where: {
        room_type_id: roomTypeId
      },
      data: {
        room_type_name: name,
        monthly_rent: parseFloat(monthly_rent) || 0,
        security_deposit: parseFloat(security_deposit) || 0,
        prepaid_amount: parseFloat(prepaid_amount) || 0,
        amenities: JSON.stringify(amenitiesData),
        updated_at: new Date()
      }
    });
    // จัดการรูปภาพ
    // ลบรูปเดิมทั้งหมด
    await prisma.room_type_images.deleteMany({
      where: {
        room_type_id: roomTypeId
      }
    });
    
    // เพิ่มรูปเก่าที่ต้องการเก็บไว้
    if (existing_images) {
      const existingImagesList = JSON.parse(existing_images);
      const existingImagePromises = existingImagesList.map(imageUrl =>
        prisma.room_type_images.create({
          data: {
            room_type_id: roomTypeId,
            image_url: imageUrl
          }
        })
      );
      await Promise.all(existingImagePromises);
    }
    
    // เพิ่มรูปใหม่
    if (req.files && req.files.length > 0) {
      const newImagePromises = req.files.map(file =>
        prisma.room_type_images.create({
          data: {
            room_type_id: roomTypeId,
            image_url: file.filename
          }
        })
      );
      await Promise.all(newImagePromises);
    }

    res.json({ message: "Room type updated successfully" });
  } catch (err) {
    console.error("updateRoomType error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
};

//  ลบประเภทห้อง
exports.deleteRoomType = async (req, res) => {
  try {
    const roomTypeId = parseInt(req.params.id);
    // ตรวจว่ามีห้องที่ยังอ้างถึง room_type_id นี้อยู่ไหม
    const roomCount = await prisma.rooms.count({
      where: {
        room_type_id: roomTypeId
      }
    });
    if (roomCount > 0) {
      return res.status(400).json({
        error: `ไม่สามารถลบประเภทห้องได้ เนื่องจากมีห้อง ${roomCount} ห้องที่ยังใช้งานอยู่`,
      });
    }
    // ถ้าไม่มีห้องที่ใช้งานอยู่ → ลบได้
    await prisma.room_types.delete({
      where: {
        room_type_id: roomTypeId
      }
    });
    res.json({ message: "Room type deleted" });
  } catch (err) {
    console.error("deleteRoomType error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

