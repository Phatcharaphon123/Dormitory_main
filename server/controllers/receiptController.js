const prisma = require('../config/prisma');

// 📄 สร้างใบเสร็จสำหรับสัญญา
exports.createReceipt = async (req, res) => {
  try {
    const { contractId } = req.params;
    const {
      deposit_monthly,
      advance_amount,
      services,
      discount = 0,
      payment_method = 'cash',
      receipt_date = new Date().toISOString().split('T')[0],
      receipt_note = ''
    } = req.body;

    const result = await prisma.$transaction(async (prisma) => {
      // คำนวณยอดรวม
      const serviceTotal = services?.reduce((sum, service) => sum + parseFloat(service.price || 0), 0) || 0;
      const totalAmount = parseFloat(deposit_monthly || 0) + parseFloat(advance_amount || 0) + serviceTotal - parseFloat(discount || 0);

      // สร้างเลขที่ใบเสร็จ (รูปแบบเดียวกับบิลรายเดือน)
      const generateReceiptNumber = () => {
        const today = new Date();
        const dateStr = today.getFullYear().toString() + 
                         (today.getMonth() + 1).toString().padStart(2, '0') + 
                         today.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `RC${dateStr}${random}`;
      };
      
      const receiptNumber = generateReceiptNumber();

      // สร้างใบเสร็จหลัก
      const receipt = await prisma.move_in_receipts.create({
        data: {
          contract_id: parseInt(contractId),
          receipt_number: receiptNumber,
          total_amount: totalAmount,
          payment_method: payment_method,
          receipt_date: new Date(receipt_date),
          receipt_note: receipt_note
        }
      });

      const receiptId = receipt.move_in_receipt_id;

      // เพิ่มรายการในใบเสร็จ
      const items = [];
      
      if (parseFloat(deposit_monthly || 0) > 0) {
        items.push({
          move_in_receipt_id: receiptId,
          item_type: 'deposit',
          description: 'เงินประกัน',
          quantity: 1,
          unit_price: parseFloat(deposit_monthly),
          total_price: parseFloat(deposit_monthly)
        });
      }

      if (parseFloat(advance_amount || 0) > 0) {
        items.push({
          move_in_receipt_id: receiptId,
          item_type: 'advance',
          description: 'ค่าเช่าล่วงหน้า',
          quantity: 1,
          unit_price: parseFloat(advance_amount),
          total_price: parseFloat(advance_amount)
        });
      }

      // เพิ่มบริการเพิ่มเติม
      if (services && services.length > 0) {
        for (const service of services) {
          items.push({
            move_in_receipt_id: receiptId,
            item_type: 'service',
            description: service.description || service.name,
            quantity: service.quantity || 1,
            unit_price: parseFloat(service.unitPrice || service.price || 0),
            total_price: parseFloat(service.price || 0)
          });
        }
      }

      // เพิ่มส่วนลด (ถ้ามี)
      if (parseFloat(discount || 0) > 0) {
        items.push({
          move_in_receipt_id: receiptId,
          item_type: 'discount',
          description: 'ส่วนลด',
          quantity: 1,
          unit_price: parseFloat(-discount),
          total_price: parseFloat(-discount)
        });
      }

      // สร้าง items ทั้งหมดพร้อมกัน
      if (items.length > 0) {
        await prisma.move_in_receipt_items.createMany({
          data: items
        });
      }

      return { receiptId, receiptNumber, totalAmount };
    });

    res.status(201).json({
      message: 'สร้างใบเสร็จสำเร็จ',
      receipt_id: result.receiptId,
      receipt_number: result.receiptNumber,
      total_amount: result.totalAmount
    });

  } catch (err) {
    console.error('Error creating receipt:', err);
    res.status(500).json({ error: 'Failed to create receipt: ' + err.message });
  }
};

// 📥 ดึงข้อมูลใบเสร็จ
exports.getReceipt = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    // ดึงข้อมูลใบเสร็จ
    const receipt = await prisma.move_in_receipts.findFirst({
      where: {
        contract_id: parseInt(contractId)
      },
      include: {
        contracts: {
          include: {
            tenants: {
              select: {
                first_name: true,
                last_name: true,
                phone_number: true,
                address: true,
                province: true,
                district: true,
                subdistrict: true
              }
            },
            rooms: {
              include: {
                room_types: {
                  select: {
                    room_type_name: true
                  }
                },
                dormitories: {
                  select: {
                    name: true,
                    phone: true,
                    email: true,
                    address: true,
                    province: true,
                    district: true,
                    subdistrict: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!receipt) {
      return res.status(404).json({ error: 'ไม่พบใบเสร็จ' });
    }

    // ดึงรายการในใบเสร็จ
    const items = await prisma.move_in_receipt_items.findMany({
      where: {
        move_in_receipt_id: receipt.move_in_receipt_id
      },
      select: {
        item_type: true,
        description: true,
        quantity: true,
        unit_price: true,
        total_price: true
      },
      orderBy: [
        {
          move_in_receipt_item_id: 'asc'
        }
      ]
    });

    // จัดเรียงตาม item_type
    const sortedItems = items.sort((a, b) => {
      const order = { 'deposit': 1, 'advance': 2, 'service': 3, 'discount': 4 };
      return (order[a.item_type] || 5) - (order[b.item_type] || 5);
    });

    // จัดรูปแบบข้อมูลส่งกลับ
    const contract = receipt.contracts;
    const tenant = contract.tenants;
    const room = contract.rooms;
    const roomType = room.room_types;
    const dorm = room.dormitories;

    const response = {
      ...receipt,
      contract_start_date: contract.contract_start_date,
      first_name: tenant.first_name,
      last_name: tenant.last_name,
      phone_number: tenant.phone_number,
      address: tenant.address,
      province: tenant.province,
      district: tenant.district,
      subdistrict: tenant.subdistrict,
      room_number: room.room_number,
      room_type: roomType?.room_type_name,
      dorm_name: dorm.name,
      dorm_phone: dorm.phone,
      dorm_email: dorm.email,
      dorm_address: dorm.address,
      dorm_province: dorm.province,
      dorm_district: dorm.district,
      dorm_subdistrict: dorm.subdistrict,
      contract_services_id: receipt.move_in_receipt_id, // สำหรับ backward compatibility
      services: JSON.stringify(sortedItems.filter(item => item.item_type === 'service').map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        price: item.total_price
      }))),
      all_items: sortedItems
    };

    res.json(response);

  } catch (err) {
    console.error('Error fetching receipt:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// 📥 ดึงใบเสร็จทั้งหมดของหอพัก
exports.getReceiptsByDorm = async (req, res) => {
  try {
    const { dormId } = req.params;
    
    const receipts = await prisma.move_in_receipts.findMany({
      where: {
        contracts: {
          rooms: {
            dorm_id: parseInt(dormId)
          }
        }
      },
      include: {
        contracts: {
          include: {
            tenants: {
              select: {
                first_name: true,
                last_name: true
              }
            },
            rooms: {
              select: {
                room_number: true
              }
            }
          },
          select: {
            contract_start_date: true,
            tenants: true,
            rooms: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const formattedReceipts = receipts.map(receipt => ({
      receipt_id: receipt.move_in_receipt_id,
      receipt_number: receipt.receipt_number,
      total_amount: receipt.total_amount,
      payment_method: receipt.payment_method,
      receipt_date: receipt.receipt_date,
      created_at: receipt.created_at,
      contract_start_date: receipt.contracts.contract_start_date,
      first_name: receipt.contracts.tenants.first_name,
      last_name: receipt.contracts.tenants.last_name,
      room_number: receipt.contracts.rooms.room_number
    }));

    res.json(formattedReceipts);

  } catch (err) {
    console.error('Error fetching receipts:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// 📄 ดึงหมายเหตุเริ่มต้นสำหรับใบเสร็จ (จากตาราง default_receipt_notes)
exports.getDefaultReceiptNote = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { receipt_type = 'move_out' } = req.query; // รับ receipt_type จาก query parameter
    
    // ดึง note_content จากตาราง default_receipt_notes ตาม receipt_type
    const result = await prisma.default_receipt_notes.findFirst({
      where: {
        dorm_id: parseInt(dormId),
        receipt_type: receipt_type
      },
      select: {
        note_content: true
      }
    });
    
    // ถ้าไม่พบข้อมูล ให้ส่งค่าว่างกลับไป
    const noteContent = result ? result.note_content : '';
    
    res.json({ 
      note_content: noteContent || '',
      receipt_type: receipt_type,
      dorm_id: dormId
    });
  } catch (error) {
    console.error('❌ Error fetching default receipt note:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงหมายเหตุเริ่มต้น' });
  }
};

// 📄 บันทึกหมายเหตุเริ่มต้นสำหรับใบเสร็จ (บันทึกลงในตาราง default_receipt_notes)
exports.saveDefaultReceiptNote = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { note_content, receipt_type = 'move_out' } = req.body; // รับ receipt_type จาก body
    
    console.log('📝 บันทึกหมายเหตุเริ่มต้น:', {
      dormId,
      receipt_type,
      note_content: note_content?.substring(0, 50) + '...'
    });
    
    // บันทึกหรืออัปเดตหมายเหตุเริ่มต้นในตาราง default_receipt_notes
    const result = await prisma.default_receipt_notes.upsert({
      where: {
        dorm_id_receipt_type: {
          dorm_id: parseInt(dormId),
          receipt_type: receipt_type
        }
      },
      update: {
        note_content: note_content || '',
        updated_at: new Date()
      },
      create: {
        dorm_id: parseInt(dormId),
        receipt_type: receipt_type,
        note_content: note_content || '',
        created_at: new Date(),
        updated_at: new Date()
      },
      select: {
        note_content: true,
        receipt_type: true
      }
    });
    
    console.log('✅ บันทึกหมายเหตุสำเร็จ:', result);
    
    res.json({ 
      message: 'บันทึกหมายเหตุเริ่มต้นสำเร็จ',
      note_content: result.note_content,
      receipt_type: result.receipt_type,
      dorm_id: dormId
    });
  } catch (error) {
    console.error('❌ Error saving default receipt note:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code
    });
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกหมายเหตุเริ่มต้น' });
  }
};

// 📝 บันทึกหมายเหตุใบเสร็จโดยตรงลงตาราง receipts
exports.saveReceiptNote = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { receipt_note } = req.body;

    // ตรวจสอบว่ามีใบเสร็จสำหรับสัญญานี้หรือไม่
    const existingReceipt = await prisma.move_in_receipts.findFirst({
      where: {
        contract_id: parseInt(contractId)
      },
      select: {
        move_in_receipt_id: true
      }
    });
    
    if (!existingReceipt) {
      return res.status(404).json({ error: 'ไม่พบใบเสร็จสำหรับสัญญานี้' });
    }

    // อัปเดตหมายเหตุในใบเสร็จ
    await prisma.move_in_receipts.updateMany({
      where: {
        contract_id: parseInt(contractId)
      },
      data: {
        receipt_note: receipt_note
      }
    });

    res.status(200).json({ 
      message: 'บันทึกหมายเหตุใบเสร็จสำเร็จ',
      receipt_note 
    });

  } catch (error) {
    console.error('❌ Error saving receipt note:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกหมายเหตุใบเสร็จ' });
  }
};

// 📝 บันทึกหมายเหตุใบเสร็จสำหรับห้องปัจจุบัน (ก่อนสร้างสัญญา)
exports.saveReceiptNoteForRoom = async (req, res) => {
  try {
    const { dormId, roomNumber } = req.params;
    const { receipt_note } = req.body;

    // ตรวจสอบว่ามีสัญญาปัจจุบันสำหรับห้องนี้หรือไม่
    const contract = await prisma.contracts.findFirst({
      where: {
        rooms: {
          dorm_id: parseInt(dormId),
          room_number: roomNumber
        },
        status: 'active'
      },
      select: {
        contract_id: true
      },
      orderBy: {
        contract_start_date: 'desc'
      }
    });

    if (!contract) {
      // ถ้าไม่มีสัญญาปัจจุบัน ให้บันทึกลง default note แทน (ใช้ receipt_type = 'monthly' เป็นค่าเริ่มต้น)
      const result = await prisma.default_receipt_notes.upsert({
        where: {
          dorm_id_receipt_type: {
            dorm_id: parseInt(dormId),
            receipt_type: 'monthly'
          }
        },
        update: {
          note_content: receipt_note,
          updated_at: new Date()
        },
        create: {
          dorm_id: parseInt(dormId),
          receipt_type: 'monthly',
          note_content: receipt_note,
          created_at: new Date(),
          updated_at: new Date()
        },
        select: {
          note_content: true
        }
      });

      return res.status(200).json({ 
        message: 'บันทึกหมายเหตุเริ่มต้นสำเร็จ',
        receipt_note: result.note_content,
        type: 'default'
      });
    }

    const contractId = contract.contract_id;

    // ตรวจสอบว่ามีใบเสร็จสำหรับสัญญานี้หรือไม่
    const receipt = await prisma.move_in_receipts.findFirst({
      where: {
        contract_id: contractId
      },
      select: {
        move_in_receipt_id: true
      }
    });
    
    if (!receipt) {
      // ถ้าไม่มีใบเสร็จ ให้บันทึกลง default note แทน (ใช้ receipt_type = 'monthly' เป็นค่าเริ่มต้น)
      const result = await prisma.default_receipt_notes.upsert({
        where: {
          dorm_id_receipt_type: {
            dorm_id: parseInt(dormId),
            receipt_type: 'monthly'
          }
        },
        update: {
          note_content: receipt_note,
          updated_at: new Date()
        },
        create: {
          dorm_id: parseInt(dormId),
          receipt_type: 'monthly',
          note_content: receipt_note,
          created_at: new Date(),
          updated_at: new Date()
        },
        select: {
          note_content: true
        }
      });

      return res.status(200).json({ 
        message: 'บันทึกหมายเหตุเริ่มต้นสำเร็จ (จะใช้สำหรับใบเสร็จใหม่)',
        receipt_note: result.note_content,
        type: 'default'
      });
    }

    // อัปเดตหมายเหตุในใบเสร็จ
    await prisma.move_in_receipts.updateMany({
      where: {
        contract_id: contractId
      },
      data: {
        receipt_note: receipt_note
      }
    });

    res.status(200).json({ 
      message: 'บันทึกหมายเหตุใบเสร็จสำเร็จ',
      receipt_note,
      type: 'receipt'
    });

  } catch (error) {
    console.error('❌ Error saving receipt note for room:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกหมายเหตุ' });
  }
};

