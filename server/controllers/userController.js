const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// สมัครสมาชิก
const register = async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน' 
      });
    }

    // ตรวจสอบรูปแบบอีเมล
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'รูปแบบอีเมลไม่ถูกต้อง' 
      });
    }

    // ตรวจสอบความยาวรหัสผ่าน
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' 
      });
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่แล้วหรือไม่
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว' 
      });
    }

    // เข้ารหัสรหัสผ่าน
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // บันทึกผู้ใช้ใหม่
    const newUser = await pool.query(
      'INSERT INTO users (username, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING user_id, username, email, phone',
      [username, email, phone || null, password_hash]
    );

    res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
    });
  }
};

// เข้าสู่ระบบ
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' 
      });
    }

    // ค้นหาผู้ใช้
    const user = await pool.query(
      'SELECT user_id, username, email, phone, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' 
      });
    }

    // ตรวจสอบรหัสผ่าน
    const isPasswordValid = await bcrypt.compare(password, user.rows[0].password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' 
      });
    }

    // สร้าง JWT Token
    const token = jwt.sign(
      { 
        user_id: user.rows[0].user_id, 
        username: user.rows[0].username 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        user_id: user.rows[0].user_id,
        username: user.rows[0].username,
        email: user.rows[0].email,
        phone: user.rows[0].phone
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
    });
  }
};

// ตรวจสอบสถานะการเข้าสู่ระบบ
const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'ไม่พบ Token' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // ค้นหาข้อมูลผู้ใช้
    const user = await pool.query(
      'SELECT user_id, username, email, phone FROM users WHERE user_id = $1',
      [decoded.user_id]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'ไม่พบผู้ใช้' 
      });
    }

    res.json({
      success: true,
      user: user.rows[0]
    });

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้อง'
    });
  }
};

// อัปเดตข้อมูลโปรไฟล์
const updateProfile = async (req, res) => {
  try {
    // ใช้ข้อมูลจาก middleware authMiddleware
    const { user_id } = req.user;
    const { username, email, phone } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!username || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกชื่อผู้ใช้และอีเมล' 
      });
    }

    // ตรวจสอบรูปแบบอีเมล
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'รูปแบบอีเมลไม่ถูกต้อง' 
      });
    }

    // ตรวจสอบว่า username ไม่ซ้ำกับผู้ใช้อื่น (ยกเว้นตัวเอง)
    const existingUsername = await pool.query(
      'SELECT user_id FROM users WHERE username = $1 AND user_id != $2',
      [username, user_id]
    );

    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' 
      });
    }

    // ตรวจสอบว่า email ไม่ซ้ำกับผู้ใช้อื่น (ยกเว้นตัวเอง)
    const existingEmail = await pool.query(
      'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
      [email, user_id]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'อีเมลนี้ถูกใช้งานแล้ว' 
      });
    }

    // อัปเดตข้อมูล
    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, phone = $3, updated_at = NOW() WHERE user_id = $4 RETURNING user_id, username, email, phone',
      [username, email, phone || null, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบผู้ใช้' 
      });
    }

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลสำเร็จ',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล'
    });
  }
};

// เปลี่ยนรหัสผ่าน
const changePassword = async (req, res) => {
  try {
    // ใช้ข้อมูลจาก middleware authMiddleware
    const { user_id } = req.user;
    const { currentPassword, newPassword } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่' 
      });
    }

    // ตรวจสอบความยาวรหัสผ่านใหม่
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' 
      });
    }

    // ค้นหาผู้ใช้และรหัสผ่านปัจจุบัน
    const user = await pool.query(
      'SELECT user_id, password_hash FROM users WHERE user_id = $1',
      [user_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบผู้ใช้' 
      });
    }

    // ตรวจสอบรหัสผ่านปัจจุบัน
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' 
      });
    }

    // เข้ารหัสรหัสผ่านใหม่
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // อัปเดตรหัสผ่าน
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [newPasswordHash, user_id]
    );

    res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
    });
  }
};

// รีเซ็ตรหัสผ่านโดยใช้ Token (ไม่ต้องใส่รหัสผ่านเก่า)
const resetPasswordWithToken = async (req, res) => {
  try {
    // ใช้ข้อมูลจาก middleware authMiddleware
    const { user_id } = req.user;
    const { newPassword } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกรหัสผ่านใหม่' 
      });
    }

    // ตรวจสอบความยาวรหัสผ่านใหม่
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' 
      });
    }

    // เข้ารหัสรหัสผ่านใหม่
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // อัปเดตรหัสผ่าน
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [newPasswordHash, user_id]
    );

    res.json({
      success: true,
      message: 'รีเซ็ตรหัสผ่านสำเร็จ'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
    });
  }
};

module.exports = {
  register,
  login,
  verifyToken,
  updateProfile,
  changePassword,
  resetPasswordWithToken
};
