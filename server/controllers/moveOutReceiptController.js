const prisma = require('../config/prisma');

/**
 * ดึงข้อมูลใบเสร็จการย้ายออกสำหรับแสดงผล
 */
exports.getMoveOutReceiptData = async (req, res) => {
  try {
    const { dormId, roomNumber } = req.params;

    // ดึงข้อมูลใบเสร็จการย้ายออก
    const moveOutContract = await prisma.contracts.findFirst({
      where: {
        rooms: {
          room_number: roomNumber,
          dorm_id: parseInt(dormId)
        },
        status: 'terminated'
      },
      include: {
        tenants: true,
        rooms: {
          include: {
            dormitories: true
          }
        },
        room_types: true,
        move_out_receipts: {
          include: {
            move_out_receipt_items: true
          },
          orderBy: {
            created_at: 'desc'
          }
        }
      },
      orderBy: {
        termination_date: 'desc'
      }
    });

    if (!moveOutContract) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการย้ายออกของห้องนี้'
      });
    }

    const moveOutReceipt = moveOutContract.move_out_receipts[0];
    const tenant = moveOutContract.tenants;
    const room = moveOutContract.rooms;
    const dorm = room.dormitories;
    const roomType = moveOutContract.room_types;


    // ดึงรายการ adjustments จาก move_out_receipt_items (ถ้ามีใบเสร็จ)
    let adjustments = [];
    if (moveOutReceipt && moveOutReceipt.move_out_receipt_items) {

      adjustments = moveOutReceipt.move_out_receipt_items.map(item => ({
        type: item.item_type,
        description: item.description,
        amount: parseFloat(item.total_price || 0),
        unit: parseFloat(item.quantity || 1),
        price_per_unit: parseFloat(item.unit_price || 0),
        pricePerUnit: parseFloat(item.unit_price || 0)
      }));
    }

    // ดึงข้อมูล utility rates
    const rates = await prisma.utility_rates.findFirst({
      where: {
        dorm_id: parseInt(dormId)
      },
      orderBy: {
        created_at: 'desc'
      }
    }) || { water_rate: 15, electricity_rate: 7 };

    // สร้างรายการ items สำหรับใบเสร็จจากข้อมูลที่บันทึกไว้แล้วใน move_out_receipt_items
    const items = adjustments.map(adj => ({
      type: adj.type,
      description: adj.description,
      unit: adj.unit,
      price_per_unit: adj.price_per_unit,
      pricePerUnit: adj.pricePerUnit,
      amount: adj.amount
    }));

    // สร้างที่อยู่แบบเต็ม
    const createFullAddress = (addressObj) => {
      const parts = [];
      if (addressObj.address) parts.push(addressObj.address);
      if (addressObj.subdistrict) parts.push(`ตำบล${addressObj.subdistrict}`);
      if (addressObj.district) parts.push(`อำเภอ${addressObj.district}`);
      if (addressObj.province) parts.push(`จังหวัด${addressObj.province}`);
      return parts.join(' ');
    };

    // จัดรูปแบบข้อมูลสำหรับ frontend
    const receiptData = {
      // ข้อมูลใบเสร็จ
      terminationId: moveOutContract.contract_id,
      receipt_number: moveOutReceipt?.receipt_number || `MO${moveOutContract.contract_id}`,
      receiptNumber: moveOutReceipt?.receipt_number || `MO${moveOutContract.contract_id}`,
      
      // ข้อมูลสัญญา - เพิ่มเพื่อการนำทาง
      contractId: moveOutContract.contract_id,
      contract_id: moveOutContract.contract_id,
      
      // ข้อมูลผู้เช่า
      tenantName: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'ไม่ระบุ',
      tenantPhone: tenant.phone_number || 'ไม่ระบุ',
      tenantAddress: createFullAddress(tenant) || 'ไม่ระบุ',
      tenantAddressMain: tenant.address || '',
      tenantSubdistrict: tenant.subdistrict || '',
      tenantDistrict: tenant.district || '',
      tenantProvince: tenant.province || '',
      tenantIdNumber: tenant.id_card_number || '',
      
      // ข้อมูลห้อง
      roomNumber: room.room_number,
      roomType: moveOutContract.room_type_name || roomType?.room_type_name || 'ไม่ระบุ',
      monthlyRent: parseFloat(moveOutContract.monthly_rent || 0),
      
      // ข้อมูลวันที่
      checkoutDate: moveOutContract.termination_date || moveOutReceipt?.move_out_date,
      checkinDate: moveOutContract.contract_start_date,
      receiptDate: moveOutReceipt?.receipt_date || moveOutContract.termination_date,
      
      // ข้อมูลการเงิน
      deposit: parseFloat(moveOutContract.deposit_monthly || 0),
      advance: parseFloat(moveOutContract.advance_amount || 0),
      finalAmount: parseFloat(moveOutReceipt?.net_amount || 0),
      paymentMethod: moveOutReceipt?.payment_method || 'เงินสด',
      
      // ข้อมูลหอพัก
      dormName: dorm.name || 'หอพักไม่ระบุ',
      dormAddress: createFullAddress(dorm) || '',
      dormPhone: dorm.phone || '',
      dormEmail: dorm.email || '',
      
      // ข้อมูลมิเตอร์
      initialMeterReading: {
        water: moveOutContract.water_meter_start || 0,
        electric: moveOutContract.electric_meter_start || 0
      },
      currentMeterReading: {
        water: moveOutContract.water_meter_end || 0,
        electric: moveOutContract.electric_meter_end || 0
      },
      
      // อัตราค่าสาธารณูปโภค
      rates: {
        water: parseFloat(rates.water_rate || 15),
        electric: parseFloat(rates.electricity_rate || 7)
      },
      
      // รายการทั้งหมด
      items: items,
      adjustments: adjustments,
      
      // อื่นๆ
      receiptNote: moveOutReceipt?.receipt_note || 'ใบเสร็จการย้ายออกจากหอพัก',
      createdAt: moveOutContract.termination_date
    };

    res.json({
      success: true,
      data: receiptData
    });

  } catch (error) {
    console.error('❌ [getMoveOutReceiptData] เกิดข้อผิดพลาด:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบเสร็จการย้ายออก',
      error: error.message
    });
  }
};

/**
 * ดึงข้อมูลใบเสร็จการย้ายออกโดยใช้ move_out_receipt_id (PK)
 */
exports.getMoveOutReceiptById = async (req, res) => {
  try {
    const { moveOutReceiptId } = req.params;

    // ตรวจสอบว่า moveOutReceiptId เป็นตัวเลขหรือไม่
    if (!/^\d+$/.test(moveOutReceiptId)) {
      return res.status(400).json({
        success: false,
        message: 'move_out_receipt_id ต้องเป็นตัวเลข'
      });
    }

    // ดึงข้อมูลจาก move_out_receipts
    const moveOutReceipt = await prisma.move_out_receipts.findFirst({
      where: {
        move_out_receipt_id: parseInt(moveOutReceiptId)
      },
      include: {
        contracts: {
          include: {
            tenants: true,
            rooms: {
              include: {
                dormitories: true
              }
            },
            room_types: true
          }
        },
        move_out_receipt_items: {
          orderBy: {
            move_out_receipt_item_id: 'asc'
          }
        }
      }
    });

    if (!moveOutReceipt) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลใบเสร็จการย้ายออก'
      });
    }

    const contract = moveOutReceipt.contracts;
    const tenant = contract.tenants;
    const room = contract.rooms;
    const dorm = room.dormitories;
    const roomType = contract.room_types;

    // ดึงรายการ items จาก move_out_receipt_items

    const items = moveOutReceipt.move_out_receipt_items.map(item => {
      console.log('🔧 Processing item from DB:', JSON.stringify(item, null, 2));
      
      // คำนวณ amount ตามประเภท
      let amount = parseFloat(item.total_price || 0);
      if (item.item_type === 'refund') {
        amount = -Math.abs(amount); // refund ต้องเป็นลบ
      } else {
        amount = Math.abs(amount); // charge/penalty เป็นบวก
      }
      
      const processedItem = {
        type: item.item_type,
        description: item.description,
        unit: parseFloat(item.quantity || 1),
        price_per_unit: parseFloat(item.unit_price || 0), // ใช้ price_per_unit ตรงกับ frontend
        pricePerUnit: parseFloat(item.unit_price || 0),   // เพิ่ม camelCase version เผื่อ
        amount: amount
      };
      console.log('🔧 Processed item:', JSON.stringify(processedItem, null, 2));
      return processedItem;
    });

    // ดึงข้อมูล utility rates
    const rates = await prisma.utility_rates.findFirst({
      where: {
        dorm_id: dorm.dorm_id
      },
      orderBy: {
        created_at: 'desc'
      }
    }) || { water_rate: 15, electricity_rate: 7 };

    // สร้างที่อยู่แบบเต็ม
    const createFullAddress = (addressObj) => {
      const parts = [];
      if (addressObj.address) parts.push(addressObj.address);
      if (addressObj.subdistrict) parts.push(`ตำบล${addressObj.subdistrict}`);
      if (addressObj.district) parts.push(`อำเภอ${addressObj.district}`);
      if (addressObj.province) parts.push(`จังหวัด${addressObj.province}`);
      return parts.join(' ');
    };

    // จัดรูปแบบข้อมูลสำหรับ frontend
    const receiptData = {
      // ข้อมูลใบเสร็จ
      move_out_receipt_id: moveOutReceipt.move_out_receipt_id,
      receipt_number: moveOutReceipt.receipt_number || `MO${moveOutReceipt.move_out_receipt_id}`,
      receiptNumber: moveOutReceipt.receipt_number || `MO${moveOutReceipt.move_out_receipt_id}`,
      
      // ข้อมูลสัญญา - เพิ่มเพื่อการนำทาง
      contractId: contract.contract_id,
      contract_id: contract.contract_id,
      
      // ข้อมูลผู้เช่า
      tenantName: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'ไม่ระบุ',
      tenantPhone: tenant.phone_number || 'ไม่ระบุ',
      tenantAddress: createFullAddress(tenant) || 'ไม่ระบุ',
      tenantAddressMain: tenant.address || '',
      tenantSubdistrict: tenant.subdistrict || '',
      tenantDistrict: tenant.district || '',
      tenantProvince: tenant.province || '',
      tenantIdNumber: tenant.id_card_number || '',
      
      // ข้อมูลห้อง
      roomNumber: room.room_number,
      roomType: contract.room_type_name || roomType?.room_type_name || 'ไม่ระบุ',
      monthlyRent: parseFloat(contract.monthly_rent || 0),
      
      // ข้อมูลวันที่
      checkoutDate: contract.termination_date || moveOutReceipt.move_out_date,
      checkinDate: contract.contract_start_date,
      receiptDate: moveOutReceipt.receipt_date || contract.termination_date,
      
      // ข้อมูลการเงิน
      deposit: parseFloat(contract.deposit_monthly || 0),
      advance: parseFloat(contract.advance_amount || 0),
      finalAmount: parseFloat(moveOutReceipt.net_amount || 0),
      paymentMethod: moveOutReceipt.payment_method || 'เงินสด',
      
      // ข้อมูลหอพัก
      dormName: dorm.name || 'หอพักไม่ระบุ',
      dormAddress: createFullAddress(dorm) || '',
      dormPhone: dorm.phone || '',
      dormEmail: dorm.email || '',
      
      // ข้อมูลมิเตอร์
      initialMeterReading: {
        water: contract.water_meter_start || 0,
        electric: contract.electric_meter_start || 0
      },
      currentMeterReading: {
        water: contract.water_meter_end || 0,
        electric: contract.electric_meter_end || 0
      },
      
      // อัตราค่าสาธารณูปโภค
      rates: {
        water: parseFloat(rates.water_rate || 15),
        electric: parseFloat(rates.electricity_rate || 7)
      },
      
      // รายการทั้งหมด
      items: items,
      
      // อื่นๆ
      receiptNote: moveOutReceipt.receipt_note || 'ใบเสร็จการย้ายออกจากหอพัก',
      createdAt: moveOutReceipt.created_at
    };

    res.json({
      success: true,
      data: receiptData
    });

  } catch (error) {
    console.error('❌ [getMoveOutReceiptById] เกิดข้อผิดพลาด:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบเสร็จการย้ายออก',
      error: error.message
    });
  }
};

/**
 * ดึงใบเสร็จการย้ายออกตามเดือนและปี
 */
exports.getMoveOutReceiptsByMonth = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { month, year } = req.query;

    // สร้าง where condition
    let whereCondition = {
      contracts: {
        rooms: {
          dorm_id: parseInt(dormId)
        }
      }
    };

    // เพิ่มเงื่อนไขเดือน/ปี ถ้ามีการระบุ
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      
      whereCondition.receipt_date = {
        gte: startDate,
        lte: endDate
      };
    }

    const receipts = await prisma.move_out_receipts.findMany({
      where: whereCondition,
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
          }
        }
      },
      orderBy: [
        { created_at: 'desc' },
        { receipt_date: 'desc' }
      ]
    });

    // จัดรูปแบบข้อมูลให้ตรงกับ format เดิม
    const formattedReceipts = receipts.map(receipt => {
      const contract = receipt.contracts;
      if (!contract) {
        console.log('❌ No contract found for receipt:', receipt.move_out_receipt_id);
        return null;
      }
      const tenant = contract.tenants;
      const room = contract.rooms;
      
      // จัดรูปแบบวันที่
      const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      };
      
      // กำหนดช่องทางการชำระ
      const paymentChannel = receipt.payment_method === 'โอนเงิน' ? 'โอนเงิน' : 'เงินสด';
      
      return {
        id: receipt.move_out_receipt_id,
        originalId: receipt.move_out_receipt_id,
        receiptNo: receipt.receipt_number,
        payer: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim(),
        paymentDate: formatDate(receipt.receipt_date),
        moveOutDate: receipt.receipt_date,
        room: room.room_number,
        channel: paymentChannel,
        totalAmount: receipt.net_amount,
        paidAmount: receipt.net_amount,
        amount: receipt.net_amount,
        receiptType: 'move_out',
        isRefund: receipt.net_amount < 0,
        status: 'ชำระแล้ว',
        createdAt: receipt.created_at,
        created_at: receipt.created_at
      };
    }).filter(receipt => receipt !== null); // กรองออก null entries

    res.json(formattedReceipts);

  } catch (error) {
    console.error('❌ [getMoveOutReceiptsByMonth] เกิดข้อผิดพลาด:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบเสร็จการย้ายออก',
      error: error.message
    });
  }
};
