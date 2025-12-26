const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

exports.createAdmin = async (req, res) => {
    try{
        const{ username, email, password, phone, dormId, role = 'ADMIN', enabled = true } = req.body;
        // ตรวจสอบ dormId
        const parsedDormId = parseInt(dormId);
        if (isNaN(parsedDormId)) {
            return res.status(400).json({ error: "dormId ต้องเป็นตัวเลข" });
        }
        const dorm = await prisma.dormitories.findUnique({
            where: { dorm_id: parsedDormId }
        })
        if (!dorm) {
            return res.status(404).json({ error: "ไม่พบหอพักที่ระบุ" });
        }
        const existingUser = await prisma.users.findUnique({
            where: { email: email }
        });
        if (existingUser) {
            return res.status(400).json({ error: "อีเมลนี้มีการใช้งานแล้ว" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        // สร้างพนักงานใหม่ (ไม่ใส่ dormId)
        const newAdmin = await prisma.users.create({
            data: {
                username,
                email,
                password_hash: hashedPassword,
                phone,
                role: 'ADMIN', // ใช้ ADMIN role
            }
        })

        await prisma.dorm_staffs.create({
            data: {
                dorm_id: parsedDormId,
                user_id: newAdmin.user_id,
            }
        })
        res.status(201).json(newAdmin);
    }catch(err){
        console.error(err);
        res.status(500).json({message: 'Server Error'});
    }
}

exports.getAdmin = async (req, res) => {
    try{
        const userId = req.user.user_id;
        
        // ดึงหอพักที่เป็นของ owner คนนี้ก่อน
        const ownedDorms = await prisma.dormitories.findMany({
            where: { user_id: userId },
            select: { dorm_id: true }
        });
        
        const dormIds = ownedDorms.map(d => d.dorm_id);
        
        // ดึง admin ที่ทำงานในหอพักของ owner นี้เท่านั้น
        const adminList = await prisma.users.findMany({
            where: { 
                role: 'ADMIN',
                working_dorms: {
                    some: {
                        dorm_id: {
                            in: dormIds
                        }
                    }
                }
            },
            include: {
                working_dorms: {
                    where: {
                        dorm_id: {
                            in: dormIds
                        }
                    },
                    include: {
                        dorm: {
                            select: {
                                dorm_id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });
        res.json(adminList);
    }catch(err){
        console.error('Error in getAdmin:', err);
        res.status(500).json({message: 'Server Error', error: err.message});
    }
}

exports.updateAdmin = async (req, res) => {
    try {
        const adminId = parseInt(req.params.id);
        const { username, email, phone, dormId, enabled } = req.body;
        
        if (isNaN(adminId)) {
            return res.status(400).json({ error: "Admin ID ต้องเป็นตัวเลข" });
        }
        
        // ตรวจสอบว่า admin มีอยู่จริง
        const existingAdmin = await prisma.users.findUnique({
            where: { user_id: adminId, role: 'ADMIN' }
        });
        
        if (!existingAdmin) {
            return res.status(404).json({ error: "ไม่พบ Admin ที่ระบุ" });
        }
        
        // อัปเดตข้อมูล admin
        const updatedAdmin = await prisma.users.update({
            where: { user_id: adminId },
            data: {
                username: username || existingAdmin.username,
                email: email || existingAdmin.email,
                phone: phone || existingAdmin.phone,
                is_active: enabled !== undefined ? enabled : existingAdmin.is_active
            }
        });
        
        // ถ้ามี dormId ให้อัปเดต dorm_staffs
        if (dormId) {
            const parsedDormId = parseInt(dormId);
            if (!isNaN(parsedDormId)) {
                // ลบ relationship เก่า
                await prisma.dorm_staffs.deleteMany({
                    where: { user_id: adminId }
                });
                
                // เพิ่ม relationship ใหม่
                await prisma.dorm_staffs.create({
                    data: {
                        dorm_id: parsedDormId,
                        user_id: adminId
                    }
                });
            }
        }
        
        res.json({ message: "อัปเดต Admin สำเร็จ", admin: updatedAdmin });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดต Admin" });
    }
};

exports.deleteAdmin = async (req, res) => {
    try {
        const adminId = parseInt(req.params.id);
        
        if (isNaN(adminId)) {
            return res.status(400).json({ error: "Admin ID ต้องเป็นตัวเลข" });
        }
        
        // ตรวจสอบว่า admin มีอยู่จริง
        const existingAdmin = await prisma.users.findUnique({
            where: { user_id: adminId, role: 'ADMIN' }
        });
        
        if (!existingAdmin) {
            return res.status(404).json({ error: "ไม่พบ Admin ที่ระบุ" });
        }
        
        // ลบ relationship ใน dorm_staffs ก่อน
        await prisma.dorm_staffs.deleteMany({
            where: { user_id: adminId }
        });
        
        // ลบ admin
        await prisma.users.delete({
            where: { user_id: adminId }
        });
        
        res.json({ message: "ลบ Admin สำเร็จ" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบ Admin" });
    }
};

