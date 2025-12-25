const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// สมัครสมาชิก
exports.register = async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    // --- (ส่วนตรวจสอบข้อมูล Validation เหมือนเดิม ไม่ต้องแก้) ---
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "รูปแบบอีเมลไม่ถูกต้อง" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
        });
    }

    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [{ username: username }, { email: email }],
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({
          success: false,
          message: "ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว",
        });
    }
    // -----------------------------------------------------

    // เข้ารหัสรหัสผ่าน
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // บันทึกผู้ใช้ใหม่
    const newUser = await prisma.users.create({
      data: {
        username,
        email,
        phone: phone || null,
        password_hash,
        role: "OWNER",
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    res.status(200).json(newUser);
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการสมัครสมาชิก",
    });
  }
};

exports.login = async (req, res) => {
  try {
    // 1. รับค่า email และ password
    const { email, password } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกอีเมลและรหัสผ่าน",
      });
    }

    // 2. ค้นหาผู้ใช้ด้วย Email
    const user = await prisma.users.findUnique({
      where: {
        email: email,
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        phone: true,
        password_hash: true,
        role: true,     
        is_active: true,
        tenant_info: {   
          select: {
            tenant_id: true,
            first_name: true,
            room_id: true,
          },
        },
        // ✅ เพิ่มตรงนี้ 1: ดึงข้อมูลว่า Staff ดูแลหอไหน (ผ่าน Relation)
        working_dorms: {
          take: 1, // เอามาแค่ 1 หอ (กรณีดูแลหลายหอค่อยว่ากัน)
          select: {
            dorm_id: true
          }
        }
      },
    });

    // กรณีไม่พบผู้ใช้
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    // 3. เช็คสถานะบัญชี
    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อเจ้าหน้าที่",
      });
    }

    // 4. ตรวจสอบรหัสผ่าน
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    // ถ้ามีข้อมูลใน working_dorms ให้เอา dorm_id ตัวแรกมา ถ้าไม่มีให้เป็น null
    const staffDormId = user.working_dorms?.[0]?.dorm_id || null;

    // 5. สร้าง JWT Token
    const payload = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_info?.tenant_id || null,
      staffDormId: staffDormId 
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || process.env.SECRETE_KEY || 'your_fallback_secret',
      { expiresIn: "24h" }
    );

    // 6. ส่ง Response กลับไปให้ Frontend
    res.json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",
      token: token,
      payload: payload, 
      user: {          
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_active: user.is_active,
        staffDormId: staffDormId // ส่งกลับไปเผื่อใช้แสดงผล
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
    });
  }
};

// ตรวจสอบสถานะการเข้าสู่ระบบ
exports.verifyToken = async (req, res) => {
  try {
    // 1. ดึง Token จาก Header (Format: "Bearer <token>")
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "ไม่พบ Token การยืนยันตัวตน",
      });
    }

    // 2. ตรวจสอบความถูกต้องของ Token (Signature & Expiry)
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || process.env.SECRETE_KEY || 'your_fallback_secret' 
    );

    // 3. ค้นหาข้อมูลผู้ใช้ล่าสุดจาก DB
    // (ต้อง Query ใหม่ทุกครั้ง เพื่อให้ได้ข้อมูลล่าสุด เช่น Role หรือ Status)
    const user = await prisma.users.findUnique({
      where: {
        user_id: decoded.user_id,
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        phone: true,
        role: true,      // จำเป็นมาก
        is_active: true, // ✅ ดึงสถานะมาเช็ค
        tenant_info: {   // ดึงข้อมูล Tenant
          select: {
            tenant_id: true,
            first_name: true,
            room_id: true,
          },
        },
      },
    });

    // กรณีไม่เจอ User ใน DB (อาจจะโดนลบไปแล้ว)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "ไม่พบข้อมูลผู้ใช้ในระบบ",
      });
    }

    // ✅ 4. เช็คสถานะบัญชี (สำคัญ: ถ้าโดนแบน ต้องเข้าไม่ได้)
    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: "บัญชีของคุณถูกระงับการใช้งาน",
      });
    }

    // 5. ส่งข้อมูลกลับไปให้ Frontend (AuthContext)
    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_active: user.is_active,
        tenant_id: user.tenant_info?.tenant_id || null, 
      },
    });

  } catch (error) {
    console.error("Verify token error:", error);
    // กรณี Token หมดอายุ หรือ Signature ผิด
    res.status(401).json({
      success: false,
      message: "Session หมดอายุ หรือ Token ไม่ถูกต้อง",
    });
  }
};

// อัปเดตข้อมูลโปรไฟล์
exports.updateProfile = async (req, res) => {
  try {
    // ใช้ข้อมูลจาก middleware authMiddleware
    const { user_id } = req.user;
    const { username, email, phone } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!username || !email) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกชื่อผู้ใช้และอีเมล",
      });
    }

    // ตรวจสอบรูปแบบอีเมล
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "รูปแบบอีเมลไม่ถูกต้อง",
      });
    }

    // ตรวจสอบว่า username ไม่ซ้ำกับผู้ใช้อื่น (ยกเว้นตัวเอง)
    const existingUsername = await prisma.users.findFirst({
      where: {
        username: username,
        NOT: {
          user_id: user_id,
        },
      },
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว",
      });
    }

    // ตรวจสอบว่า email ไม่ซ้ำกับผู้ใช้อื่น (ยกเว้นตัวเอง)
    const existingEmail = await prisma.users.findFirst({
      where: {
        email: email,
        NOT: {
          user_id: user_id,
        },
      },
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }

    // อัปเดตข้อมูล
    const result = await prisma.users.update({
      where: {
        user_id: user_id,
      },
      data: {
        username,
        email,
        phone: phone || null,
        updated_at: new Date(),
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        phone: true,
      },
    });

    res.json({
      success: true,
      message: "อัปเดตข้อมูลสำเร็จ",
      user: result,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล",
    });
  }
};

// เปลี่ยนรหัสผ่าน
exports.changePassword = async (req, res) => {
  try {
    // ใช้ข้อมูลจาก middleware authMiddleware
    const { user_id } = req.user;
    const { currentPassword, newPassword } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่",
      });
    }

    // ตรวจสอบความยาวรหัสผ่านใหม่
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร",
      });
    }

    // ค้นหาผู้ใช้และรหัสผ่านปัจจุบัน
    const user = await prisma.users.findUnique({
      where: {
        user_id: user_id,
      },
      select: {
        user_id: true,
        password_hash: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบผู้ใช้",
      });
    }

    // ตรวจสอบรหัสผ่านปัจจุบัน
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
      });
    }

    // เข้ารหัสรหัสผ่านใหม่
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // อัปเดตรหัสผ่าน
    await prisma.users.update({
      where: {
        user_id: user_id,
      },
      data: {
        password_hash: newPasswordHash,
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: "เปลี่ยนรหัสผ่านสำเร็จ",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน",
    });
  }
};

// รีเซ็ตรหัสผ่านโดยใช้ Token (ไม่ต้องใส่รหัสผ่านเก่า)
exports.resetPasswordWithToken = async (req, res) => {
  try {
    // ใช้ข้อมูลจาก middleware authMiddleware
    const { user_id } = req.user;
    const { newPassword } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกรหัสผ่านใหม่",
      });
    }

    // ตรวจสอบความยาวรหัสผ่านใหม่
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร",
      });
    }

    // เข้ารหัสรหัสผ่านใหม่
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // อัปเดตรหัสผ่าน
    await prisma.users.update({
      where: {
        user_id: user_id,
      },
      data: {
        password_hash: newPasswordHash,
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: "รีเซ็ตรหัสผ่านสำเร็จ",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน",
    });
  }
};
