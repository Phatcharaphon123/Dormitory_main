const jwt = require("jsonwebtoken");
const  prisma  = require("../config/prisma");

// 1. authCheck: ตรวจสอบ Token และดึงข้อมูล User ล่าสุด
exports.authCheck = async (req, res, next) => {
    try {
        // รับ Token จาก Header
        const headerToken = req.headers.authorization;
        
        if (!headerToken) {
            return res.status(401).json({ 
                success: false, 
                message: "No Token, Authorization Denied" 
            });
        }

        const token = headerToken.split(" ")[1];

        // Verify Token
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || process.env.SECRETE_KEY
        );
        
        // เก็บ payload จาก token ไว้ก่อน
        req.user = decoded;

        // ค้นหา User ล่าสุดจาก DB (เช็คว่า User ยังมีตัวตนจริงไหม)
        const user = await prisma.users.findUnique({
            where: { 
                email: req.user.email 
            }
        });

        // กรณีไม่เจอ User ในระบบ
        if (!user) {
             return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // เช็คสถานะ Active (ถ้าโดนแบน ห้ามเข้า)
        if (user.is_active === false) {
            return res.status(403).json({ 
                success: false, 
                message: 'This account has been suspended' 
            });
        }

        // ✅ สำคัญ: อัปเดต req.user เป็นข้อมูลล่าสุดจาก DB (รวม Role ล่าสุดด้วย)
        req.user = user; 
        
        next();

    } catch (err) {
        console.error("Auth Check Error:", err);
        // แยกกรณี Token หมดอายุ
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token Expired' });
        }
        res.status(401).json({ success: false, message: 'Token Invalid' });
    }
};

// ----------------------------------------------------------------------
// Role Check Middlewares
// (ทำงานต่อจาก authCheck ดังนั้น req.user จะมีข้อมูลครบแล้ว ไม่ต้อง Query ซ้ำ)
// ----------------------------------------------------------------------

// 2. สำหรับ SUPER_ADMIN เท่านั้น
exports.superAdminCheck = async (req, res, next) => {
    try {
        // ดึง Role จาก req.user ที่ authCheck เตรียมไว้ให้
        const { role } = req.user; 

        if (role !== 'SUPER_ADMIN') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access Denied: Admin Only' 
            });
        }
        next();
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Error Admin Check' });
    }
};

// 3. สำหรับ OWNER (รวมถึง SUPER_ADMIN ก็ควรเข้าได้ เพราะใหญ่สุด)
exports.ownerCheck = async (req, res, next) => {
    try {
        const { role } = req.user;

        if (role !== 'OWNER' && role !== 'SUPER_ADMIN') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access Denied: Owner Resource' 
            });
        }
        next();
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Error Owner Check' });
    }
};

// 4. สำหรับ STAFF และ OWNER (เช่น หน้าดูบิล, จดมิเตอร์)
exports.staffCheck = async (req, res, next) => {
    try {
        const { role } = req.user;
        
        // อนุญาต: STAFF, OWNER, SUPER_ADMIN
        const allowed = ['STAFF', 'OWNER', 'SUPER_ADMIN'];

        if (!allowed.includes(role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access Denied: Staff/Owner Resource' 
            });
        }
        next();
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Error Staff Check' });
    }
};