const  prisma  = require("../config/prisma");
const emailService = require("../services/emailService");

// ดึงรอบจดมิเตอร์ทั้งหมดของหอพัก
exports.getMeterRecordsByDorm = async (req, res) => {
  const { dormId } = req.params;
  const user_id = req.user.user_id;

  try {
    // ตรวจสอบว่าหอพักเป็นของ user ที่ login
    const ownershipCheck = await prisma.dormitories.findFirst({
      where: {
        dorm_id: parseInt(dormId),
        user_id: user_id
      },
      select: { dorm_id: true }
    });

    if (!ownershipCheck) {
      return res
        .status(403)
        .json({ error: "Access denied: ไม่สามารถเข้าถึงข้อมูลหอพักนี้ได้" });
    }

    const records = await prisma.meter_records.findMany({
      where: {
        dorm_id: parseInt(dormId)
      },
      select: {
        meter_record_id: true,
        meter_record_date: true
      },
      orderBy: {
        meter_record_date: 'desc'
      }
    });

    // แปลงวันที่เป็น YYYY-MM-DD ตามเวลาไทย
    const formatted = records.map((row) => ({
      meter_record_id: row.meter_record_id,
      meter_record_date: new Date(row.meter_record_date).toLocaleDateString(
        "sv-SE",
        {
          timeZone: "Asia/Bangkok",
        }
      ),
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching meter records:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงรอบจดมิเตอร์" });
  }
};

// Controller
exports.getRoomsByMeterRecordId = async (req, res) => {
  const { dormId, meterRecordId } = req.params;
  const user_id = req.user.user_id;

  try {
    // ตรวจสอบว่าหอพักเป็นของ user ที่ login
    const ownershipCheck = await prisma.dormitories.findFirst({
      where: {
        dorm_id: parseInt(dormId),
        user_id: user_id
      },
      select: { dorm_id: true }
    });

    if (!ownershipCheck) {
      return res
        .status(403)
        .json({ error: "Access denied: ไม่สามารถเข้าถึงข้อมูลหอพักนี้ได้" });
    }

    // ดึงข้อมูลการอ่านมิเตอร์พร้อมข้อมูลห้องและความสัมพันธ์
    const meterReadings = await prisma.meter_readings.findMany({
      where: {
        meter_record_id: parseInt(meterRecordId),
        rooms: {
          dorm_id: parseInt(dormId)
        }
      },
      include: {
        rooms: {
          include: {
            room_types: true,
            contracts: {
              where: {
                status: 'active'
              },
              include: {
                tenants: true
              },
              orderBy: {
                contract_start_date: 'desc'
              },
              take: 1
            }
          }
        },
        meter_records: true
      },
      orderBy: [
        { rooms: { floor_number: 'asc' } },
        { rooms: { room_number: 'asc' } }
      ]
    });

    // ดึงข้อมูลใบแจ้งหนี้ที่เกี่ยวข้อง
    const invoices = await prisma.invoice_receipts.findMany({
      where: {
        dorm_id: parseInt(dormId),
        monthly_invoices: {
          meter_record_id: parseInt(meterRecordId)
        }
      },
      select: {
        room_id: true,
        invoice_receipt_id: true,
        total: true
      }
    });

    // สร้าง map สำหรับการค้นหาใบแจ้งหนี้อย่างรวดเร็ว
    const invoiceMap = {};
    invoices.forEach(inv => {
      invoiceMap[inv.room_id] = inv;
    });

    // จัดรูปแบบข้อมูล
    const formattedData = meterReadings.map(reading => {
      const room = reading.rooms;
      const roomType = room.room_types;
      const contract = room.contracts[0]; // เอาสัญญาแรก (ล่าสุด)
      const tenant = contract?.tenants;
      const invoice = invoiceMap[room.room_id];

      // คำนวณค่าใช้จ่าย
      const roomRate = parseFloat(roomType?.monthly_rent) || 0;
      const waterUsage = parseInt(reading.water_unit_used) || 0;
      const waterRateValue = parseFloat(reading.water_rate) || 0;
      const electricUsage = parseInt(reading.electric_unit_used) || 0; 
      const electricRateValue = parseFloat(reading.electricity_rate) || 0;
      
      const waterCharge = waterUsage * waterRateValue;
      const electricityCharge = electricUsage * electricRateValue;
      const calculatedTotal = roomRate + waterCharge + electricityCharge;
      
      
      // ใช้ calculatedTotal แทน invoice.total เสมอ
      const totalAmount = calculatedTotal;

      return {
        roomId: room.room_id,
        room_id: room.room_id,
        room_number: room.room_number,
        floor: room.floor_number,
        room_type_id: room.room_type_id,
        tenantId: contract?.tenant_id || null,
        tenant_id: contract?.tenant_id || null,
        tenant: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'ไม่มีผู้เช่า',
        roomRate: roomRate,
        room_rate: roomRate,
        water_prev: reading.water_prev || 0,
        water_curr: reading.water_curr || 0,
        electric_prev: reading.electric_prev || 0,
        electric_curr: reading.electric_curr || 0,
        waterUsage: waterUsage,
        water_usage: waterUsage,
        electricUsage: electricUsage,
        electric_usage: electricUsage,
        waterRate: waterRateValue,
        water_rate: waterRateValue,
        electricityRate: electricRateValue,
        electricity_rate: electricRateValue,
        water_charge: waterCharge,
        electricity_charge: electricityCharge,
        total_amount: totalAmount,
        has_invoice: !!invoice,
        contract_status: contract?.status || 'no_contract',
        reading_date: reading.created_at
      };
    });

    res.json(formattedData);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดใน getRoomsByMeterRecordId:", error);
    res
      .status(500)
      .json({ error: "ไม่สามารถดึงข้อมูลห้องได้: " + error.message });
  }
};

exports.createInvoices = async (req, res) => {
  const { dormId } = req.params;
  const user_id = req.user.user_id;

  // ✅ ย้ายฟังก์ชันมาข้างบน
  const generateInvoiceNumber = () => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const dd = now.getDate().toString().padStart(2, "0");
    const rand = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `INV${yy}${mm}${dd}${rand}`;
  };

  try {
    // ตรวจสอบว่าหอพักเป็นของ user ที่ login
    const ownershipCheck = await prisma.dormitories.findFirst({
      where: {
        dorm_id: parseInt(dormId),
        user_id: user_id
      },
      select: { dorm_id: true }
    });

    if (!ownershipCheck) {
      return res
        .status(403)
        .json({ error: "Access denied: ไม่สามารถเข้าถึงข้อมูลหอพักนี้ได้" });
    }

    const { meterRecordId, billMonth, dueDate, lateFeePerDay, rooms } =
      req.body;

    // Validate input data
    if (!meterRecordId || !billMonth || !dueDate || !lateFeePerDay || !rooms || !Array.isArray(rooms)) {
      return res.status(400).json({
        error: "ข้อมูลไม่ครบถ้วน",
        details: "กรุณาตรวจสอบ meterRecordId, billMonth, dueDate, lateFeePerDay, และ rooms"
      });
    }

    if (rooms.length === 0) {
      return res.status(400).json({
        error: "ไม่มีข้อมูลห้องที่จะสร้างใบแจ้งหนี้"
      });
    }

    // แปลง YYYY-MM เป็น YYYY-MM-01
    const formatBillMonth = (billMonth) => {
      if (billMonth.includes("-01")) {
        return billMonth;
      }
      return `${billMonth}-01`;
    };

    const formattedBillMonth = formatBillMonth(billMonth);

    await prisma.$transaction(async (tx) => {
      try {
        // สร้าง monthly invoice
        const monthlyInvoice = await tx.monthly_invoices.create({
          data: {
            meter_record_id: parseInt(meterRecordId),
            dorm_id: parseInt(dormId),
            issue_date: new Date(),
            due_date: new Date(dueDate),
            charge_per_day: parseFloat(lateFeePerDay),
            month: new Date(formattedBillMonth)
          }
        });

        const monthlyInvoiceId = monthlyInvoice.monthly_invoice_id;

      for (const room of rooms) {
        console.log('🏠 Processing room:', {
          roomNumber: room.room_number,
          roomId: room.roomId || room.room_id,
          tenantId: room.tenantId || room.tenant_id,
          roomRate: room.roomRate || room.room_rate,
          waterUsage: room.waterUsage || room.water_usage
        });

        // ตรวจสอบข้อมูลห้อง (รองรับทั้ง camelCase และ snake_case)
        const roomId = room.roomId || room.room_id;
        const tenantId = room.tenantId || room.tenant_id;
        
        if (!roomId || !tenantId) {
          console.error("❌ Missing roomId/tenantId for room:", room);
          throw new Error(
            `ข้อมูลห้องไม่ครบถ้วน: ห้อง ${roomId || "ไม่ระบุ"}`
          );
        }

        const invoiceNumber = generateInvoiceNumber();

        // คำนวณยอดรวม (รองรับทั้ง camelCase และ snake_case)
        const roomRate = parseFloat(room.roomRate || room.room_rate) || 0;
        const waterUsage = parseInt(room.waterUsage || room.water_usage) || 0;
        const waterRate = parseFloat(room.waterRate || room.water_rate) || 0;
        const electricUsage = parseInt(room.electricUsage || room.electric_usage) || 0;
        const electricityRate = parseFloat(room.electricityRate || room.electricity_rate) || 0;
        
        const waterCharge = waterUsage * waterRate;
        const electricCharge = electricUsage * electricityRate;
        const totalAmount = roomRate + waterCharge + electricCharge;
        // ดึงข้อมูลอัตราค่าสาธารณูปโภคล่าสุด
        const utilityRate = await tx.utility_rates.findFirst({
          where: { dorm_id: parseInt(dormId) },
          orderBy: { start_date: 'desc' }
        });

        // สร้างใบแจ้งหนี้
        const invoice = await tx.invoice_receipts.create({
          data: {
            monthly_invoice_id: monthlyInvoiceId,
            dorm_id: parseInt(dormId),
            utility_rate_id: utilityRate?.utility_rate_id,
            room_id: parseInt(roomId),
            tenant_id: parseInt(tenantId),
            total: totalAmount,
            status: 'unpaid',
            invoice_number: invoiceNumber,
            bill_month: new Date(formattedBillMonth),
            due_date: new Date(dueDate)
          }
        });

        const invoiceId = invoice.invoice_receipt_id;

        // ✅ เพิ่มรายการบิลที่แยกออกจากกัน (ใช้ตัวแปรที่คำนวณแล้ว)
        await tx.invoice_receipt_items.createMany({
          data: [
            {
              invoice_receipt_id: invoiceId,
              item_type: 'rent',
              description: 'ค่าเช่าห้อง',
              unit_count: 1,
              price: roomRate,
              amount: roomRate
            },
            {
              invoice_receipt_id: invoiceId,
              item_type: 'water',
              description: `ค่าน้ำ: ${waterUsage} หน่วย`,
              unit_count: waterUsage,
              price: waterRate,
              amount: waterCharge
            },
            {
              invoice_receipt_id: invoiceId,
              item_type: 'electric',
              description: `ค่าไฟ: ${electricUsage} หน่วย`,
              unit_count: electricUsage,
              price: electricityRate,
              amount: electricCharge
            }
          ]
        });

        // ✅ เพิ่มบริการรายเดือนจากสัญญา
        const contractServices = await tx.monthly_service.findMany({
          where: {
            contracts: {
              room_id: parseInt(roomId),
              status: 'active'
            },
            is_active: true
          }
        });

        if (contractServices.length > 0) {
          const serviceItems = contractServices.map(service => ({
            invoice_receipt_id: invoiceId,
            item_type: 'service',
            description: service.service_name,
            unit_count: service.quantity || 1,
            price: service.service_price,
            amount: parseFloat(service.service_price.toString()) * (service.quantity || 1)
          }));

          await tx.invoice_receipt_items.createMany({
            data: serviceItems
          });
        }

        // ✅ อัปเดตยอดรวมใน invoice (ใช้ transaction context)
        const invoiceItems = await tx.invoice_receipt_items.findMany({
          where: {
            invoice_receipt_id: invoiceId
          },
          select: {
            item_type: true,
            amount: true
          }
        });

        const calculatedTotal = invoiceItems.reduce((sum, item) => {
          const amount = parseFloat(item.amount?.toString()) || 0;
          // ตรวจสอบว่าเป็น discount หรือไม่
          if (item.item_type === "discount") {
            // สำหรับ discount ให้ลบออกจาก total (ถ้า amount เป็น positive ให้แปลงเป็น negative)
            return sum - Math.abs(amount);
          }
          return sum + amount;
        }, 0);

        // อัพเดท total ในตาราง invoice_receipts
        await tx.invoice_receipts.update({
          where: {
            invoice_receipt_id: invoiceId
          },
          data: {
            total: calculatedTotal,
            updated_at: new Date()
          }
        });

        console.log(`✅ Invoice ${invoiceId} created with total: ${calculatedTotal}`);

      }
      } catch (txError) {
        console.error('❌ Transaction error:', txError);
        throw txError; // Re-throw เพื่อให้ transaction rollback
      }
    });

    console.log('✅ All invoices created successfully');
    res.status(201).json({ message: "สร้างใบแจ้งหนี้สำเร็จแล้ว" });
  } catch (error) {
    console.error("❌ createInvoices error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้",
      details: error.message,
    });
  }
};

// ดึงเดือนที่มีใบแจ้งหนี้
exports.getAvailableInvoiceMonths = async (req, res) => {
  const { dormId } = req.params;
  const user_id = req.user.user_id;

  try {
    // ตรวจสอบว่าหอพักเป็นของ user ที่ login
    const ownershipCheck = await prisma.dormitories.findFirst({
      where: {
        dorm_id: parseInt(dormId),
        user_id: user_id
      },
      select: { dorm_id: true }
    });

    if (!ownershipCheck) {
      return res
        .status(403)
        .json({ error: "Access denied: ไม่สามารถเข้าถึงข้อมูลหอพักนี้ได้" });
    }

    // ดึงข้อมูลเดือนที่มีใบแจ้งหนี้แล้วจัดรูปแบบใน JavaScript
    const invoices = await prisma.invoice_receipts.findMany({
      where: {
        dorm_id: parseInt(dormId),
        bill_month: {
          not: null
        }
      },
      select: {
        bill_month: true
      },
      distinct: ['bill_month'],
      orderBy: {
        bill_month: 'desc'
      }
    });

    // แปลงวันที่เป็น YYYY-MM format
    const result = invoices.map(invoice => ({
      bill_month: new Date(invoice.bill_month).toISOString().substring(0, 7)
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching available invoice months:", error);
    res.status(500).json({ error: "ไม่สามารถโหลดรายการรอบบิลได้" });
  }
};

// ดึงใบแจ้งหนี้ทั้งหมดของหอพักที่สร้างแล้วมาแสดง
exports.getInvoicesByDormAndMonth = async (req, res) => {
  const { dormId } = req.params;
  const { month } = req.query;
  const user_id = req.user.user_id;

  try {
    // ตรวจสอบว่าหอพักเป็นของ user ที่ login
    const ownershipCheck = await prisma.dormitories.findFirst({
      where: {
        dorm_id: parseInt(dormId),
        user_id: user_id
      },
      select: { dorm_id: true }
    });

    if (!ownershipCheck) {
      return res
        .status(403)
        .json({ error: "Access denied: ไม่สามารถเข้าถึงข้อมูลหอพักนี้ได้" });
    }

    let whereClause = {
      dorm_id: parseInt(dormId)
    };

    // ถ้ามี month parameter ให้กรองตามเดือน
    if (month) {
      // แปลง YYYY-MM เป็น date range
      const startDate = new Date(`${month}-01`);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      whereClause.bill_month = {
        gte: startDate,
        lte: endDate
      };
    }

    const invoices = await prisma.invoice_receipts.findMany({
      where: whereClause,
      include: {
        rooms: {
          select: {
            room_number: true,
            floor_number: true
          }
        },
        tenants: {
          select: {
            first_name: true,
            last_name: true,
            address: true,
            phone_number: true,
            email: true,
            subdistrict: true,
            district: true,
            province: true
          }
        },
        dormitories: {
          select: {
            name: true,
            address: true,
            phone: true,
            subdistrict: true,
            district: true,
            province: true
          }
        },
        invoice_receipt_items: {
          select: {
            invoice_receipt_item_id: true,
            description: true,
            amount: true,
            unit_count: true,
            price: true,
            item_type: true
          }
        }
      },
      orderBy: [
        { bill_month: 'desc' },
        { rooms: { floor_number: 'asc' } },
        { rooms: { room_number: 'asc' } }
      ]
    });

    // จัดรูปแบบข้อมูล
    const formattedInvoices = invoices.map(invoice => {
      const tenant = invoice.tenants;
      const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : 'ไม่มีผู้เช่า';
      
      return {
        id: invoice.invoice_receipt_id,
        room_number: invoice.rooms.room_number,
        floor: invoice.rooms.floor_number,
        tenant: tenantName,
        tenant_name: tenantName,
        tenant_address: tenant?.address,
        tenant_phone: tenant?.phone_number,
        tenant_email: tenant?.email,
        tenant_subdistrict: tenant?.subdistrict,
        tenant_district: tenant?.district,
        tenant_province: tenant?.province,
        amount: invoice.total,
        status: invoice.status,
        invoice_number: invoice.invoice_number,
        due_date: invoice.due_date,
        dorm_name: invoice.dormitories.name,
        dorm_address: invoice.dormitories.address,
        dorm_phone: invoice.dormitories.phone,
        dorm_subdistrict: invoice.dormitories.subdistrict,
        dorm_district: invoice.dormitories.district,
        dorm_province: invoice.dormitories.province,
        bill_month: invoice.bill_month ? new Date(invoice.bill_month).toISOString().substring(0, 7) : null,
        invoice_items: invoice.invoice_receipt_items.map(item => ({
          id: item.invoice_receipt_item_id,
          description: item.description,
          amount: item.amount,
          unit_count: item.unit_count,
          price: item.price,
          item_type: item.item_type
        }))
      };
    });


    res.json(formattedInvoices);
  } catch (error) {
    res.status(500).json({
      error: "ไม่สามารถโหลดข้อมูลบิลได้",
      details: error.message,
    });
  }
};

// ดึงข้อมูลใบแจ้งหนี้ของแต่ละ ID
exports.getInvoiceItemsByInvoiceId = async (req, res) => {
  const { dormId, invoiceId } = req.params;

  try {
    // ดึงข้อมูลใบแจ้งหนี้หลัก
    const invoice = await prisma.invoice_receipts.findFirst({
      where: {
        invoice_receipt_id: parseInt(invoiceId),
        dorm_id: parseInt(dormId)
      },
      include: {
        monthly_invoices: {
          include: {
            meter_records: true
          }
        },
        rooms: true,
        tenants: true,
        dormitories: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: "ไม่พบใบแจ้งหนี้ที่ระบุ" });
    }

    // อัปเดตค่าปรับล่าช้าอัตโนมัติ
    const lateData = await exports.updateLateFee(invoiceId);

    // ดึงข้อมูลรายการค่าใช้จ่าย (invoice_items) หลังจากอัปเดตค่าปรับ
    const invoiceItems = await prisma.invoice_receipt_items.findMany({
      where: {
        invoice_receipt_id: parseInt(invoiceId)
      },
      orderBy: [
        {
          item_type: 'asc'
        },
        {
          invoice_receipt_item_id: 'asc'
        }
      ]
    });

    // คำนวณ total จากรายการจริง แทนการใช้ค่าจากฐานข้อมูล
    const calculatedTotal = invoiceItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount?.toString()) || 0;
      // ตรวจสอบว่าเป็น discount หรือไม่
      if (item.item_type === "discount") {
        // สำหรับ discount ให้ลบออกจาก total (ถ้า amount เป็น positive ให้แปลงเป็น negative)
        return sum - Math.abs(amount);
      }
      return sum + amount;
    }, 0);

    // ดึงข้อมูลการชำระเงินทั้งหมด
    const totalPaidResult = await prisma.payments.aggregate({
      where: {
        invoice_receipt_id: parseInt(invoiceId)
      },
      _sum: {
        payment_amount: true
      },
      _count: {
        payment_id: true
      }
    });

    const totalPaid = parseFloat(totalPaidResult._sum.payment_amount?.toString()) || 0;

    // ใช้ยอดรวมที่คำนวณใหม่แทนยอดจากฐานข้อมูล
    const finalTotal = calculatedTotal;
    const balance = finalTotal - totalPaid;

    // จัดรูปแบบผลลัพธ์
    const tenant = invoice.tenants;
    const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : 'ไม่มีผู้เช่า';
    const meterRecord = invoice.monthly_invoices?.meter_records;
    const billMonth = meterRecord?.meter_record_date 
      ? new Date(meterRecord.meter_record_date).toISOString().substring(0, 7)
      : null;

    // จัดเรียงลำดับ item_type สำหรับการเรียง
    const getItemTypeOrder = (itemType) => {
      switch (itemType) {
        case 'rent': return 1;
        case 'water': return 2;
        case 'electric': return 3;
        case 'service': return 4;
        case 'discount': return 5;
        case 'late_fee': return 6;
        default: return 7;
      }
    };

    const formattedItems = invoiceItems
      .sort((a, b) => {
        const orderA = getItemTypeOrder(a.item_type);
        const orderB = getItemTypeOrder(b.item_type);
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.invoice_receipt_item_id - b.invoice_receipt_item_id;
      })
      .map(item => ({
        invoice_receipt_item_id: item.invoice_receipt_item_id,
        description: item.description,
        type: item.item_type,
        rate: item.price,
        amount: item.amount,
        unit_count: item.unit_count
      }));

    const response = {
      invoice: {
        invoice_receipt_id: invoice.invoice_receipt_id,
        monthly_invoice_id: invoice.monthly_invoice_id,
        invoice_number: invoice.invoice_number,
        room_id: invoice.room_id,
        room_number: invoice.rooms.room_number,
        floor_number: invoice.rooms.floor_number,
        tenant_name: tenantName,
        tenant_address: tenant?.address,
        tenant_phone: tenant?.phone_number,
        tenant_province: tenant?.province,
        tenant_district: tenant?.district,
        tenant_subdistrict: tenant?.subdistrict,
        status: balance <= 0 ? "paid" : "unpaid", // อัปเดต status ตามยอดคงเหลือ
        created_at: invoice.created_at,
        total: finalTotal, // ใช้ยอดรวมที่คำนวณใหม่
        total_paid: totalPaid,
        balance: balance,
        dorm_name: invoice.dormitories.name,
        dorm_address: invoice.dormitories.address,
        dorm_subdistrict: invoice.dormitories.subdistrict,
        dorm_district: invoice.dormitories.district,
        dorm_province: invoice.dormitories.province,
        dorm_phone: invoice.dormitories.phone,
        meter_record_date: meterRecord?.meter_record_date,
        bill_month: billMonth,
        due_date: invoice.due_date,
        charge_per_day: invoice.monthly_invoices?.charge_per_day,
        late_fee: lateData.lateFee,
        late_days: lateData.lateDays,
      },
      invoice_items: formattedItems,
    };

    res.json(response);
  } catch (error) {
    console.error("🔥 Error in getInvoiceItemsByInvoiceId:", error);
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการดึงข้อมูลใบแจ้งหนี้: " + error.message,
    });
  }
};

exports.addInvoiceItem = async (req, res) => {
  const { dormId, invoiceId } = req.params;
  const {
    description,
    type, // 'service' | 'discount'
    amount, // ยอดเงินรวม (อาจเป็นค่าลบสำหรับ discount)
    rate, // ราคาต่อหน่วย
    unit_count, // จำนวนหน่วย (default: 1)
    quantity, // default: 1
  } = req.body;

  try {
    // ตรวจสอบว่า invoice มีอยู่จริงหรือไม่
    const invoiceCheck = await prisma.invoice_receipts.findFirst({
      where: {
        invoice_receipt_id: parseInt(invoiceId),
        dorm_id: parseInt(dormId)
      },
      select: { invoice_receipt_id: true }
    });

    if (!invoiceCheck) {
      return res.status(404).json({ error: "ไม่พบใบแจ้งหนี้ที่ระบุ" });
    }

    // คำนวณราคาและยอดรวมที่ถูกต้องตาม type
    let finalPrice = parseFloat(rate) || 0;
    const unitCount = unit_count ?? 1;

    // ถ้าเป็นส่วนลด ให้เก็บเป็นค่าลบ
    if (type === "discount") {
      finalPrice = -Math.abs(finalPrice);
    }

    // คำนวณ amount = price * unit_count
    const calculatedAmount = finalPrice * unitCount;

    // เพิ่มรายการใหม่
    const result = await prisma.invoice_receipt_items.create({
      data: {
        invoice_receipt_id: parseInt(invoiceId),
        item_type: type,
        description: description,
        price: finalPrice,
        unit_count: unitCount,
        amount: calculatedAmount
      }
    });

    // อัพเดท total ในตาราง invoices
    await exports.updateInvoiceTotal(invoiceId);

    res.status(201).json({
      message: "เพิ่มรายการเรียบร้อย",
      item: {
        ...result,
        invoice_item_id: result.invoice_receipt_item_id,
      },
    });
  } catch (error) {
    console.error("❌ เพิ่มรายการในใบแจ้งหนี้ล้มเหลว:", error);
    res.status(500).json({ error: "เพิ่มรายการไม่สำเร็จ: " + error.message });
  }
};

/* ฟังก์ชันแก้ไขรายการในใบแจ้งหนี้ */
exports.updateInvoiceItem = async (req, res) => {
  const { dormId, invoiceId, itemId } = req.params;
  const { description, rate, unit_count } = req.body;

  try {
    // ตรวจสอบว่า item มีอยู่จริงและไม่ใช่รายการค่าพื้นฐาน
    const item = await prisma.invoice_receipt_items.findFirst({
      where: {
        invoice_receipt_item_id: parseInt(itemId),
        invoice_receipts: {
          invoice_receipt_id: parseInt(invoiceId),
          dorm_id: parseInt(dormId)
        }
      },
      include: {
        invoice_receipts: {
          select: { dorm_id: true }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: "ไม่พบรายการที่ระบุ" });
    }

    // ป้องกันการแก้ไขรายการค่าพื้นฐาน
    if (
      item.item_type === "rent" ||
      item.item_type === "water" ||
      item.item_type === "electric"
    ) {
      return res
        .status(403)
        .json({ error: "ไม่สามารถแก้ไขรายการค่าห้อง ค่าน้ำ ค่าไฟได้" });
    }

    // อัปเดตรายการ
    const result = await prisma.invoice_receipt_items.update({
      where: {
        invoice_receipt_item_id: parseInt(itemId)
      },
      data: {
        description: description || item.description,
        price: parseFloat(rate) || item.price,
        unit_count: unit_count || item.unit_count,
        amount: (parseFloat(rate) || item.price) * (unit_count || item.unit_count)
      }
    });

    // อัพเดท total ในตาราง invoices
    await exports.updateInvoiceTotal(invoiceId);

    res.json({
      message: "แก้ไขรายการเรียบร้อย",
      item: result,
    });
  } catch (error) {
    console.error("❌ แก้ไขรายการในใบแจ้งหนี้ล้มเหลว:", error);
    res.status(500).json({ error: "แก้ไขรายการไม่สำเร็จ: " + error.message });
  }
};

// ฟังก์ชันลบรายการในใบแจ้งหนี้
exports.deleteInvoiceItem = async (req, res) => {
  const { dormId, invoiceId, itemId } = req.params;

  try {
    // ตรวจสอบว่า item มีอยู่จริงและไม่ใช่รายการค่าพื้นฐาน
    const item = await prisma.invoice_receipt_items.findFirst({
      where: {
        invoice_receipt_item_id: parseInt(itemId),
        invoice_receipts: {
          invoice_receipt_id: parseInt(invoiceId),
          dorm_id: parseInt(dormId)
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: "ไม่พบรายการที่ระบุ" });
    }

    // ป้องกันการลบรายการค่าพื้นฐาน
    if (
      item.item_type === "rent" ||
      item.item_type === "water" ||
      item.item_type === "electric"
    ) {
      return res
        .status(403)
        .json({ error: "ไม่สามารถลบรายการค่าห้อง ค่าน้ำ ค่าไฟได้" });
    }

    // ลบรายการ
    await prisma.invoice_receipt_items.delete({
      where: {
        invoice_receipt_item_id: parseInt(itemId)
      }
    });

    // อัพเดท total ในตาราง invoices
    await exports.updateInvoiceTotal(invoiceId);

    res.json({ message: "ลบรายการเรียบร้อย" });
  } catch (error) {
    console.error("❌ ลบรายการในใบแจ้งหนี้ล้มเหลว:", error);
    res.status(500).json({ error: "ลบรายการไม่สำเร็จ: " + error.message });
  }
};

// ฟังก์ชันอัพเดท total ในตาราง invoices
exports.updateInvoiceTotal = async (invoiceId) => {
  try {
    // คำนวณยอดรวมโดยคำนึงถึง discount
    const invoiceItems = await prisma.invoice_receipt_items.findMany({
      where: {
        invoice_receipt_id: parseInt(invoiceId)
      },
      select: {
        item_type: true,
        amount: true
      }
    });

    const calculatedTotal = invoiceItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount?.toString()) || 0;
      // ตรวจสอบว่าเป็น discount หรือไม่
      if (item.item_type === "discount") {
        // สำหรับ discount ให้ลบออกจาก total (ถ้า amount เป็น positive ให้แปลงเป็น negative)
        return sum - Math.abs(amount);
      }
      return sum + amount;
    }, 0);

  

    // อัพเดท total ในตาราง invoice_receipts
    const result = await prisma.invoice_receipts.update({
      where: {
        invoice_receipt_id: parseInt(invoiceId)
      },
      data: {
        total: calculatedTotal,
        updated_at: new Date()
      },
      select: {
        total: true
      }
    });

    return result.total || 0;
  } catch (error) {
    console.error("❌ อัพเดท total ใน invoices ล้มเหลว:", error);
    throw error;
  }
};

// ฟังก์ชันคำนวณและอัปเดตค่าปรับล่าช้าอัตโนมัติ
exports.updateLateFee = async (invoiceId) => {
  try {
    // ดึงข้อมูลใบแจ้งหนี้
    const invoice = await prisma.invoice_receipts.findFirst({
      where: {
        invoice_receipt_id: parseInt(invoiceId)
      },
      include: {
        monthly_invoices: {
          select: {
            charge_per_day: true
          }
        }
      }
    });

    if (!invoice) {
      return { lateFee: 0, lateDays: 0 };
    }

    const currentDate = new Date();
    const dueDate = new Date(invoice.due_date);

    // คำนวณค่าปรับล่าช้า
    let lateFee = 0;
    let lateDays = 0;

    if (invoice.status === "unpaid" && currentDate > dueDate) {
      lateDays = Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24));
      const chargePerDay = parseFloat(invoice.monthly_invoices?.charge_per_day?.toString()) || 0;
      lateFee = lateDays * chargePerDay;

      // ตรวจสอบว่ามีค่าปรับล่าช้าอยู่แล้วหรือไม่
      const existingLateFee = await prisma.invoice_receipt_items.findFirst({
        where: {
          invoice_receipt_id: parseInt(invoiceId),
          item_type: 'late_fee'
        }
      });

      if (existingLateFee === null && lateFee > 0) {
        // เพิ่มค่าปรับใหม่
        await prisma.invoice_receipt_items.create({
          data: {
            invoice_receipt_id: parseInt(invoiceId),
            item_type: 'late_fee',
            description: `ค่าปรับล่าช้า (${lateDays} วัน)`,
            price: lateFee,
            unit_count: lateDays,
            amount: lateFee * lateDays
          }
        });
      } else if (existingLateFee !== null) {
        // อัปเดตค่าปรับที่มีอยู่
        await prisma.invoice_receipt_items.update({
          where: {
            invoice_receipt_item_id: existingLateFee.invoice_receipt_item_id
          },
          data: {
            description: `ค่าปรับล่าช้า (${lateDays} วัน)`,
            price: lateFee,
            unit_count: lateDays,
            amount: lateFee * lateDays
          }
        });
      }

      // อัปเดต total
      await exports.updateInvoiceTotal(invoiceId);
    }

    return { lateFee, lateDays };
  } catch (error) {
    console.error("❌ อัปเดตค่าปรับล่าช้าล้มเหลว:", error);
    throw error;
  }
};

// ฟังก์ชันสำหรับสร้างเลขที่ใบเสร็จ
exports.generateReceiptNumber = () => {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2); // เอาแค่ 2 หลักท้าย
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 999) + 1; // 1-999

  return `RC${year}${month}${day}${random}`;
};

// ฟังก์ชันบันทึกการชำระเงิน
exports.recordPayment = async (req, res) => {
  const { dormId, invoiceId } = req.params;
  const { payment_method, payment_date, payment_note } = req.body;

  console.log("🎯 Payment Request Debug:", {
    dormId,
    invoiceId,
    payment_method,
    payment_date,
    payment_note,
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // ตรวจสอบว่าใบแจ้งหนี้มีอยู่จริง
      const invoice = await tx.invoice_receipts.findFirst({
        where: {
          invoice_receipt_id: parseInt(invoiceId)
        },
        select: {
          invoice_receipt_id: true,
          total: true,
          dorm_id: true
        }
      });

      console.log("🔍 Invoice Exist Check:", {
        invoiceId,
        found: !!invoice,
        data: invoice,
      });

      if (!invoice) {
        throw new Error("ไม่พบใบแจ้งหนี้ที่ระบุ");
      }

      // ตรวจสอบว่าเป็นของหอพักที่ถูกต้อง
      if (invoice.dorm_id !== parseInt(dormId)) {
        throw new Error("ไม่มีสิทธิ์เข้าถึงใบแจ้งหนี้นี้");
      }

      // คำนวณยอดที่ชำระแล้ว
      const paymentSum = await tx.payments.aggregate({
        where: {
          invoice_receipt_id: parseInt(invoiceId)
        },
        _sum: {
          payment_amount: true
        }
      });

      const totalPaid = parseFloat(paymentSum._sum.payment_amount?.toString()) || 0;
      const remainingAmount = parseFloat(invoice.total?.toString()) - totalPaid;

      console.log(`💰 Payment Debug:`, {
        invoiceId,
        total: invoice.total,
        totalPaid,
        remainingAmount,
      });

      if (remainingAmount <= 0) {
        throw new Error("ใบแจ้งหนี้นี้ชำระครบแล้ว");
      }

      // สร้างเลขที่ใบเสร็จ
      const receiptNumber = exports.generateReceiptNumber();

      // บันทึกการชำระเงิน (ชำระเต็มจำนวนที่เหลือ)
      const payment = await tx.payments.create({
        data: {
          invoice_receipt_id: parseInt(invoiceId),
          payment_method: payment_method,
          payment_amount: remainingAmount,
          payment_date: new Date(payment_date),
          payment_note: payment_note,
          receipt_number: receiptNumber
        }
      });

      // อัปเดต status ของใบแจ้งหนี้เป็น 'paid'
      await tx.invoice_receipts.update({
        where: {
          invoice_receipt_id: parseInt(invoiceId)
        },
        data: {
          status: "paid",
          paid_date: new Date(payment_date)
        }
      });

      return payment;
    });

    res.json({
      message: "บันทึกการชำระเงินสำเร็จ",
      payment: result,
      remainingAmount: 0,
    });
  } catch (error) {
    console.error("❌ บันทึกการชำระเงินล้มเหลว:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกการชำระเงิน" });
  }
};

// ฟังก์ชันดึงประวัติการชำระเงิน
exports.getPaymentHistory = async (req, res) => {
  const { dormId, invoiceId } = req.params;

  try {
    const payments = await prisma.payments.findMany({
      where: {
        invoice_receipt_id: parseInt(invoiceId),
        invoice_receipts: {
          dorm_id: parseInt(dormId)
        }
      },
      include: {
        invoice_receipts: {
          select: {
            invoice_number: true
          }
        }
      },
      orderBy: [
        { payment_date: 'desc' },
        { created_at: 'desc' }
      ]
    });

    res.json(
      payments.map((payment) => ({
        id: payment.payment_id,
        billNumber: payment.invoice_receipts.invoice_number,
        amount: parseFloat(payment.payment_amount.toString()),
        payment_method: payment.payment_method,
        type: payment.payment_method,
        date: payment.payment_date,
        payment_date: payment.payment_date,
        note: payment.payment_note,
        payment_note: payment.payment_note,
        receiptNumber: payment.receipt_number,
        createdAt: payment.created_at,
      }))
    );
  } catch (error) {
    console.error("❌ ดึงประวัติการชำระเงินล้มเหลว:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน" });
  }
};

// ฟังก์ชันลบการชำระเงิน
exports.deletePayment = async (req, res) => {
  const { dormId, invoiceId, paymentId } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      // ตรวจสอบว่าการชำระเงินมีอยู่และเป็นของใบแจ้งหนี้ที่ถูกต้อง
      const payment = await tx.payments.findFirst({
        where: {
          payment_id: parseInt(paymentId),
          invoice_receipt_id: parseInt(invoiceId),
          invoice_receipts: {
            dorm_id: parseInt(dormId)
          }
        }
      });

      if (!payment) {
        throw new Error("ไม่พบการชำระเงินที่ระบุ");
      }

      // ลบการชำระเงิน
      await tx.payments.delete({
        where: {
          payment_id: parseInt(paymentId)
        }
      });

      // ตรวจสอบว่ายังมีการชำระเงินอื่นหรือไม่
      const remainingPaymentsCount = await tx.payments.count({
        where: {
          invoice_receipt_id: parseInt(invoiceId)
        }
      });

      // ถ้าไม่มีการชำระเงินเหลืออยู่ ให้เปลี่ยน status กลับเป็น unpaid
      if (remainingPaymentsCount === 0) {
        await tx.invoice_receipts.update({
          where: {
            invoice_receipt_id: parseInt(invoiceId)
          },
          data: {
            status: 'unpaid',
            paid_date: null
          }
        });
      }
    });

    res.json({ message: "ลบการชำระเงินสำเร็จ" });
  } catch (error) {
    console.error("❌ ลบการชำระเงินล้มเหลว:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบการชำระเงิน" });
  }
};

// ฟังก์ชันดึงใบเสร็จรับเงินทั้งหมดของหอพัก (รวมทั้ง payment receipts และ move-in receipts)
exports.getPaymentReceiptsByDorm = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { month, year } = req.query;

    // สร้าง date filter สำหรับการกรองตามเดือน/ปี
    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      dateFilter = {
        gte: startDate,
        lte: endDate
      };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
      dateFilter = {
        gte: startDate,
        lte: endDate
      };
    }

    // ดึงข้อมูล payment receipts (ใบเสร็จการชำระบิลรายเดือน)
    const paymentReceipts = await prisma.payments.findMany({
      where: {
        invoice_receipts: {
          rooms: {
            dorm_id: parseInt(dormId)
          }
        },
        ...(Object.keys(dateFilter).length > 0 && {
          payment_date: dateFilter
        })
      },
      include: {
        invoice_receipts: {
          include: {
            rooms: {
              select: {
                room_number: true
              }
            },
            tenants: {
              select: {
                first_name: true,
                last_name: true
              }
            }
          }
        }
      },
      orderBy: [
        { created_at: 'desc' },
        { payment_id: 'desc' }
      ]
    });

    // ดึงข้อมูล move-in receipts (ใบเสร็จค่าเข้าพัก)
    const moveInReceipts = await prisma.move_in_receipts.findMany({
      where: {
        contracts: {
          rooms: {
            dorm_id: parseInt(dormId)
          }
        },
        ...(Object.keys(dateFilter).length > 0 && {
          receipt_date: dateFilter
        })
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
          }
        }
      },
      orderBy: [
        { created_at: 'desc' },
        { move_in_receipt_id: 'desc' }
      ]
    });

    // รวมข้อมูลทั้งสองประเภท
    const allReceipts = [
      // Payment receipts
      ...paymentReceipts.map(payment => {
        // ค้นหาชื่อผู้เช่า (ใช้ลำดับความสำคัญ: invoice tenant -> active tenant -> fallback)
        let payerName = 'ไม่ระบุชื่อ';
        
        if (payment.invoice_receipts?.tenants) {
          const tenant = payment.invoice_receipts.tenants;
          payerName = `${tenant.first_name} ${tenant.last_name}`.trim();
        }
        
        return {
          id: payment.payment_id,
          receiptNo: payment.receipt_number,
          date: payment.payment_date,
          amount: payment.payment_amount,
          channel: payment.payment_method,
          note: payment.payment_note,
          invoiceNumber: payment.invoice_receipts?.invoice_number,
          room: payment.invoice_receipts?.rooms?.room_number,
          payer: payerName,
          status: parseFloat(payment.payment_amount.toString()) > 0 ? 'ใบเงินสด' : 'ยกเลิก',
          invoiceId: payment.invoice_receipts?.invoice_receipt_id,
          receipt_type: 'payment',
          created_at: payment.created_at
        };
      }),
      // Move-in receipts
      ...moveInReceipts.map(moveIn => ({
        id: moveIn.move_in_receipt_id,
        receiptNo: moveIn.receipt_number,
        date: moveIn.receipt_date,
        amount: moveIn.total_amount,
        channel: moveIn.payment_method,
        note: moveIn.receipt_note,
        invoiceNumber: 'Move-In',
        room: moveIn.contracts?.rooms?.room_number,
        payer: moveIn.contracts?.tenants ? 
          `${moveIn.contracts.tenants.first_name} ${moveIn.contracts.tenants.last_name}`.trim() : 
          'ไม่ระบุชื่อ',
        status: parseFloat(moveIn.total_amount.toString()) > 0 ? 'ใบเงินสด' : 'ยกเลิก',
        invoiceId: moveIn.contract_id,
        receipt_type: 'move_in',
        created_at: moveIn.created_at
      }))
    ];

    // เรียงลำดับตาม created_at (ล่าสุดไปเก่าสุด)
    const sortedReceipts = allReceipts.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      return b.id - a.id;
    });

    // จัดรูปแบบข้อมูลให้ตรงกับ frontend
    const receipts = sortedReceipts.map((row) => ({
      id: `${row.receipt_type}_${row.id}`, // เพิ่ม prefix เพื่อแยกประเภท
      receiptNo: row.receiptNo || "", // รองรับทั้ง lowercase และ camelCase
      paymentDate: new Date(row.date).toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      room: row.room || "",
      channel: exports.getPaymentChannelText(row.channel),
      amount: parseFloat(row.amount.toString()),
      totalAmount: parseFloat(row.amount.toString()), // เพิ่ม field นี้
      paidAmount: parseFloat(row.amount.toString()), // เพิ่ม field นี้
      status: row.status,
      payer: row.payer,
      note: row.note || "",
      invoiceNumber: row.invoiceNumber,
      invoiceId: row.invoiceId,
      receiptType: row.receipt_type, // เพิ่มข้อมูลประเภทใบเสร็จ
      originalId: row.id, // เก็บ ID ตัวจริงไว้สำหรับการพิมพ์
      createdAt: row.created_at, // เพิ่ม created_at สำหรับการเรียงลำดับใน frontend
      created_at: row.created_at, // เพิ่มทั้งสอง format เผื่อ frontend ใช้
    }));

    res.json(receipts);
  } catch (error) {
    console.error("❌ ดึงใบเสร็จรับเงินล้มเหลว:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงใบเสร็จรับเงิน" });
  }
};

// ฟังก์ชันช่วยแปลงประเภทการชำระเงินเป็นข้อความ
exports.getPaymentChannelText = (paymentType) => {
  switch (paymentType) {
    case "cash":
      return "เงินสด";
    case "bank_transfer":
      return "โอนเงิน";
    case "promptpay":
      return "พร้อมเพย์";
    case "credit_card":
      return "บัตรเครดิต";
    case "check":
      return "เช็ค";
    default:
      if (paymentType && paymentType.includes("SCB")) {
        return `โอนเงิน (${paymentType})`;
      }
      return paymentType || "เงินสด";
  }
};

// ฟังก์ชันลบบิลค้างชำระในรอบที่ระบุ
exports.deleteUnpaidBills = async (req, res) => {
  const { dormId } = req.params;
  const { month } = req.body;
  const user_id = req.user.user_id;

  if (!month) {
    return res.status(400).json({ error: "กรุณาระบุรอบบิลที่ต้องการลบ" });
  }

  try {
    const result = await prisma.$transaction(async (prisma) => {
      // ตรวจสอบว่าหอพักเป็นของ user ที่ login
      const dormitory = await prisma.dormitories.findFirst({
        where: {
          dorm_id: parseInt(dormId),
          user_id: user_id
        }
      });

      if (!dormitory) {
        throw new Error("Access denied: ไม่สามารถเข้าถึงข้อมูลหอพักนี้ได้");
      }

      // ค้นหาบิลค้างชำระในรอบที่ระบุ
      const unpaidBills = await prisma.invoice_receipts.findMany({
        where: {
          dorm_id: parseInt(dormId),
          bill_month: {
            gte: new Date(`${month}-01`),
            lt: new Date(new Date(`${month}-01`).getFullYear(), new Date(`${month}-01`).getMonth() + 1, 1)
          },
          status: 'unpaid'
        },
        select: {
          invoice_receipt_id: true,
          invoice_number: true,
          rooms: {
            select: {
              room_number: true
            }
          }
        }
      });

      if (unpaidBills.length === 0) {
        throw new Error("ไม่พบบิลค้างชำระในรอบที่ระบุ");
      }

      const invoiceIds = unpaidBills.map(bill => bill.invoice_receipt_id);

      // ลบ invoice_items ที่เกี่ยวข้องก่อน (เนื่องจาก foreign key constraint)
      await prisma.invoice_receipt_items.deleteMany({
        where: {
          invoice_receipt_id: {
            in: invoiceIds
          }
        }
      });

      // ลบ invoices
      const deletedInvoices = await prisma.invoice_receipts.deleteMany({
        where: {
          invoice_receipt_id: {
            in: invoiceIds
          }
        }
      });

      return {
        deletedCount: deletedInvoices.count,
        deletedBills: unpaidBills.map((bill) => ({
          invoiceNumber: bill.invoice_number,
          roomNumber: bill.rooms.room_number,
        }))
      };
    });

    res.json({
      message: `ลบบิลค้างชำระสำเร็จ จำนวน ${result.deletedCount} ใบ`,
      deletedCount: result.deletedCount,
      deletedBills: result.deletedBills,
    });
  } catch (error) {
    console.error("❌ ลบบิลค้างชำระล้มเหลว:", error);
    
    if (error.message.includes("Access denied") || error.message.includes("ไม่พบบิล")) {
      const statusCode = error.message.includes("Access denied") ? 403 : 404;
      return res.status(statusCode).json({ error: error.message });
    }
    
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบบิลค้างชำระ" });
  }
};

// ดึงบิลค้างชำระทั้งหมดของหอพัก
exports.getPendingInvoicesByDorm = async (req, res) => {
  try {
    const { dormId } = req.params;

    const billsPending = await prisma.invoice_receipts.findMany({
      where: {
        dorm_id: parseInt(dormId),
        status: 'unpaid'
      },
      include: {
        rooms: {
          select: {
            room_number: true
          }
        },
        tenants: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      },
      orderBy: [
        {
          due_date: 'asc'
        }
      ]
    });

    // จัดรูปแบบข้อมูลและคำนวณสถิติ
    const formattedBills = billsPending.map(bill => {
      const daysOverdue = bill.due_date < new Date() 
        ? Math.ceil((new Date() - bill.due_date) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        invoice_receipt_id: bill.invoice_receipt_id,
        invoice_number: bill.invoice_number,
        month: bill.bill_month,
        total_amount: bill.total,
        due_date: bill.due_date,
        status: bill.status,
        created_at: bill.created_at,
        room_number: bill.rooms?.room_number || `ห้อง-${bill.room_id}`,
        room_id: bill.room_id,
        tenant_id: bill.tenant_id,
        tenant_name: bill.tenants 
          ? `${bill.tenants.first_name} ${bill.tenants.last_name}`.trim() 
          : 'ไม่มีผู้เช่า',
        days_overdue: daysOverdue,
        bill_status: bill.due_date < new Date() ? 'overdue' : 'pending'
      };
    });

    // เรียงลำดับใหม่ตาม days_overdue DESC และ due_date ASC
    formattedBills.sort((a, b) => {
      if (a.days_overdue !== b.days_overdue) {
        return b.days_overdue - a.days_overdue;
      }
      return new Date(a.due_date) - new Date(b.due_date);
    });

    console.log("📊 Raw pending bills result:", formattedBills.length, "bills found");
    console.log("📋 Bills data:", formattedBills);

    // คำนวณสถิติ
    const totalStats = {
      total: formattedBills.length,
      pending: formattedBills.filter((bill) => bill.bill_status === "pending").length,
      overdue: formattedBills.filter((bill) => bill.bill_status === "overdue").length,
      totalAmount: formattedBills.reduce(
        (sum, bill) => sum + parseFloat(bill.total_amount),
        0
      ),
      overdueAmount: formattedBills
        .filter((bill) => bill.bill_status === "overdue")
        .reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0),
    };

    console.log("📈 Pending bills stats:", totalStats);

    res.json({
      success: true,
      data: {
        bills: formattedBills,
        stats: totalStats,
      },
    });
  } catch (error) {
    console.error("Error fetching pending invoices:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลบิลค้างชำระ",
      error: error.message,
    });
  }
};

// ดึงบิลทั้งหมดของหอพัก
exports.getAllInvoicesByDorm = async (req, res) => {
  try {
    const { dormId } = req.params;

    const billsAll = await prisma.invoice_receipts.findMany({
      where: {
        dorm_id: parseInt(dormId)
      },
      include: {
        rooms: {
          select: {
            room_number: true
          }
        },
        tenants: {
          select: {
            tenant_id: true,
            first_name: true,
            last_name: true
          }
        },
        monthly_invoices: {
          select: {
            issue_date: true,
            month: true
          }
        }
      },
      orderBy: [
        {
          created_at: 'desc'
        }
      ]
    });

    // จัดรูปแบบข้อมูลและคำนวณสถิติ
    const formattedBills = billsAll.map(bill => {
      const daysOverdue = (bill.due_date < new Date() && bill.status === 'unpaid')
        ? Math.ceil((new Date() - bill.due_date) / (1000 * 60 * 60 * 24))
        : 0;

      let billStatus = bill.status;
      if (billStatus === 'paid') {
        billStatus = 'paid';
      } else if (bill.due_date < new Date() && billStatus === 'unpaid') {
        billStatus = 'overdue';
      } else if (billStatus === 'unpaid') {
        billStatus = 'pending';
      }

      return {
        invoice_receipt_id: bill.invoice_receipt_id,
        invoice_number: bill.invoice_number,
        issue_date: bill.monthly_invoices?.issue_date || bill.created_at,
        month: bill.monthly_invoices?.month || bill.bill_month,
        total_amount: bill.total,
        due_date: bill.due_date,
        status: bill.status,
        created_at: bill.created_at,
        paid_date: bill.paid_date,
        room_number: bill.rooms.room_number,
        tenant_name: bill.tenants 
          ? `${bill.tenants.first_name} ${bill.tenants.last_name}`.trim() 
          : 'ไม่มีผู้เช่า',
        tenant_id: bill.tenants?.tenant_id,
        days_overdue: daysOverdue,
        bill_status: billStatus
      };
    });

    const result = { rows: formattedBills };

    // คำนวณสถิติ
    const bills = result.rows;
    const totalStats = {
      total: bills.length,
      paid: bills.filter((bill) => bill.bill_status === "paid").length,
      pending: bills.filter((bill) => bill.bill_status === "pending").length,
      overdue: bills.filter((bill) => bill.bill_status === "overdue").length,
      totalAmount: bills.reduce(
        (sum, bill) => sum + parseFloat(bill.total_amount),
        0
      ),
      paidAmount: bills
        .filter((bill) => bill.bill_status === "paid")
        .reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0),
      pendingAmount: bills
        .filter((bill) => bill.bill_status !== "paid")
        .reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0),
    };

    res.json({
      success: true,
      data: {
        bills: bills,
        stats: totalStats,
      },
    });
  } catch (error) {
    console.error("Error fetching all invoices:", error);
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลบิลทั้งหมด",
      error: error.message,
    });
  }
};

// ฟังก์ชันลบใบแจ้งหนี้เดี่ยว
exports.deleteSingleInvoice = async (req, res) => {
  const { dormId, invoiceId } = req.params;

  try {
    const result = await prisma.$transaction(async (prisma) => {
      // ตรวจสอบว่าใบแจ้งหนี้มีอยู่จริงและเป็นของหอพักที่ระบุ
      const invoice = await prisma.invoice_receipts.findFirst({
        where: {
          invoice_receipt_id: parseInt(invoiceId),
          dorm_id: parseInt(dormId)
        },
        include: {
          rooms: {
            select: {
              room_number: true
            }
          }
        }
      });

      if (!invoice) {
        throw new Error("ไม่พบใบแจ้งหนี้ที่ระบุ");
      }

      // ตรวจสอบว่ามีการชำระเงินแล้วหรือไม่
      const paymentCount = await prisma.payments.count({
        where: {
          invoice_receipt_id: parseInt(invoiceId)
        }
      });

      if (paymentCount > 0) {
        throw new Error("ไม่สามารถลบใบแจ้งหนี้ที่มีการชำระเงินแล้วได้");
      }

      // ลบข้อมูลการชำระเงิน (ถ้ามี)
      await prisma.payments.deleteMany({
        where: {
          invoice_receipt_id: parseInt(invoiceId)
        }
      });

      // ลบรายการในใบแจ้งหนี้
      await prisma.invoice_receipt_items.deleteMany({
        where: {
          invoice_receipt_id: parseInt(invoiceId)
        }
      });

      // ลบใบแจ้งหนี้
      await prisma.invoice_receipts.delete({
        where: {
          invoice_receipt_id: parseInt(invoiceId)
        }
      });

      return {
        roomNumber: invoice.rooms.room_number,
        invoiceId: invoiceId
      };
    });

    res.json({
      message: `ลบใบแจ้งหนี้ห้อง ${result.roomNumber} สำเร็จ`,
      deletedInvoiceId: result.invoiceId,
    });
  } catch (error) {
    console.error("🔥 Error in deleteSingleInvoice:", error);
    
    if (error.message.includes("ไม่พบใบแจ้งหนี้") || error.message.includes("ไม่สามารถลบ")) {
      const statusCode = error.message.includes("ไม่พบใบแจ้งหนี้") ? 404 : 400;
      return res.status(statusCode).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: "เกิดข้อผิดพลาดในการลบใบแจ้งหนี้: " + error.message 
    });
  }
};

// ฟังก์ชันส่งบิลทางอีเมล
exports.sendInvoicesByEmail = async (req, res) => {
  const { dormId } = req.params;
  const { month, bills } = req.body; // bills = array ของ invoice_receipt_id

  try {
    // ตรวจสอบว่ามีข้อมูลครบถ้วน
    if (!month || !bills || bills.length === 0) {
      return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });
    }

    // ดึงข้อมูลบิลพร้อมข้อมูลผู้เช่าและหอพัก
    const invoices = await prisma.invoice_receipts.findMany({
      where: {
        invoice_receipt_id: {
          in: bills.map(id => parseInt(id))
        },
        dorm_id: parseInt(dormId),
        status: 'unpaid'
      },
      include: {
        rooms: {
          select: {
            room_number: true
          }
        },
        tenants: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            address: true,
            subdistrict: true,
            district: true,
            province: true
          }
        },
        dormitories: {
          select: {
            name: true,
            email: true,
            address: true,
            phone: true,
            subdistrict: true,
            district: true,
            province: true
          }
        }
      }
    });

    if (invoices.length === 0) {
      return res.status(404).json({ error: "ไม่พบบิลค้างชำระที่ระบุ" });
    }

    // ดึงรายการค่าใช้จ่ายของแต่ละบิล
    const invoicesWithItems = await Promise.all(
      invoices.map(async (invoice) => {
        const items = await prisma.invoice_receipt_items.findMany({
          where: {
            invoice_receipt_id: invoice.invoice_receipt_id
          },
          orderBy: [
            {
              item_type: 'asc'
            }
          ],
          select: {
            description: true,
            item_type: true,
            price: true,
            unit_count: true,
            amount: true
          }
        });

        // เรียงลำดับตาม priority
        const sortedItems = items.sort((a, b) => {
          const priority = {
            'rent': 1,
            'water': 2,
            'electric': 3,
            'service': 4,
            'discount': 5,
            'late_fee': 6
          };
          return (priority[a.item_type] || 7) - (priority[b.item_type] || 7);
        });

        return {
          invoice_receipt_id: invoice.invoice_receipt_id,
          invoice_number: invoice.invoice_number,
          amount: invoice.total,
          due_date: invoice.due_date,
          created_at: invoice.created_at,
          room_number: invoice.rooms.room_number,
          tenant_name: invoice.tenants 
            ? `${invoice.tenants.first_name} ${invoice.tenants.last_name}`.trim()
            : 'ไม่มีผู้เช่า',
          tenant_email: invoice.tenants?.email,
          tenant_phone: invoice.tenants?.phone_number,
          tenant_address: invoice.tenants?.address,
          tenant_subdistrict: invoice.tenants?.subdistrict,
          tenant_district: invoice.tenants?.district,
          tenant_province: invoice.tenants?.province,
          dorm_name: invoice.dormitories.name,
          dorm_email: invoice.dormitories.email,
          dorm_address: invoice.dormitories.address,
          dorm_phone: invoice.dormitories.phone,
          dorm_subdistrict: invoice.dormitories.subdistrict,
          dorm_district: invoice.dormitories.district,
          dorm_province: invoice.dormitories.province,
          dorm_id: parseInt(dormId),
          invoice_items: sortedItems.map(item => ({
            description: item.description,
            type: item.item_type,
            price: item.price,
            unit_count: item.unit_count,
            amount: item.amount
          }))
        };
      })
    );

    // กรองเฉพาะบิลที่มีอีเมลผู้เช่า
    const billsWithEmail = invoicesWithItems.filter(
      (bill) => bill.tenant_email
    );
    const billsWithoutEmail = invoicesWithItems.filter(
      (bill) => !bill.tenant_email
    );

    if (billsWithEmail.length === 0) {
      return res.status(400).json({
        error: "ไม่พบบิลที่มีอีเมลผู้เช่า",
        details: `บิลทั้งหมด ${invoicesWithItems.length} ใบไม่มีอีเมลผู้เช่า`,
      });
    }

    // ส่งอีเมลทีละใบ
    const emailResults = await emailService.sendMultipleInvoices(
      billsWithEmail
    );

    // นับผลลัพธ์
    const successCount = emailResults.filter((result) => result.success).length;
    const failCount = emailResults.filter((result) => !result.success).length;

    // สร้างรายงานผลลัพธ์
    const report = {
      total: invoicesWithItems.length,
      sent: successCount,
      failed: failCount,
      noEmail: billsWithoutEmail.length,
      results: emailResults,
    };

    res.json({
      message: `ส่งบิลทางอีเมลสำเร็จ ${successCount} ใบ จาก ${billsWithEmail.length} ใบ`,
      report,
    });
  } catch (error) {
    console.error("❌ ส่งบิลทางอีเมลล้มเหลว:", error);
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการส่งบิลทางอีเมล",
      details: error.message,
    });
  }
};

// ฟังก์ชันทดสอบการเชื่อมต่ออีเมล
exports.testEmailConnection = async (req, res) => {
  try {
    const result = await emailService.testConnection();
    res.json(result);
  } catch (error) {
    console.error("❌ ทดสอบอีเมลล้มเหลว:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ฟังก์ชันดึงประวัติการส่งบิลของหอพัก
exports.getBillSendHistory = async (req, res) => {
  const { dormId } = req.params;
  const { month } = req.query;

  try {
    const whereConditions = {
      invoice_receipts: {
        rooms: {
          dorm_id: parseInt(dormId)
        }
      }
    };

    if (month) {
      // สร้างช่วงวันที่สำหรับเดือนที่ระบุ
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
      
      whereConditions.invoice_receipts.bill_month = {
        gte: startDate,
        lte: endDate
      };
    }

    const history = await prisma.bill_send_history.findMany({
      where: whereConditions,
      include: {
        invoice_receipts: {
          include: {
            rooms: {
              select: {
                room_number: true
              }
            },
            tenants: {
              select: {
                first_name: true,
                last_name: true
              }
            }
          }
        }
      },
      orderBy: {
        send_date: 'desc'
      }
    });

    const formattedHistory = history.map(record => ({
      bill_send_history_id: record.bill_send_history_id,
      bill_id: record.bill_id,
      send_method: record.send_method,
      send_to: record.send_to,
      send_status: record.send_status,
      send_date: record.send_date,
      error_message: record.error_message,
      invoice_receipt_id: record.invoice_receipts?.invoice_receipt_id,
      invoice_number: record.invoice_receipts?.invoice_number,
      room_number: record.invoice_receipts?.rooms?.room_number,
      tenant_name: record.invoice_receipts?.tenants 
        ? `${record.invoice_receipts.tenants.first_name} ${record.invoice_receipts.tenants.last_name}`.trim()
        : 'ไม่มีผู้เช่า'
    }));

    res.json({
      success: true,
      data: formattedHistory,
    });
  } catch (error) {
    console.error("❌ ดึงประวัติการส่งบิลล้มเหลว:", error);
    res.status(500).json({
      success: false,
      error: "เกิดข้อผิดพลาดในการดึงประวัติการส่งบิล",
      details: error.message,
    });
  }
};

// ดึงบิลค้างชำระของ contract
exports.getBillsByContract = async (req, res) => {
  const { contractId } = req.params;

  try {
    // First get the contract details to find room_id and tenant_id
    const contract = await prisma.contracts.findUnique({
      where: {
        contract_id: parseInt(contractId)
      },
      select: {
        room_id: true,
        tenant_id: true
      }
    });

    if (!contract) {
      return res.status(404).json({ error: "ไม่พบสัญญาที่ระบุ" });
    }

    // Get unpaid bills for this contract
    const billsContract = await prisma.invoice_receipts.findMany({
      where: {
        room_id: contract.room_id,
        tenant_id: contract.tenant_id,
        status: 'unpaid'
      },
      include: {
        rooms: {
          select: {
            room_number: true
          }
        },
        dormitories: {
          select: {
            name: true
          }
        },
        invoice_receipt_items: {
          select: {
            invoice_receipt_item_id: true,
            description: true,
            amount: true,
            item_type: true
          }
        }
      },
      orderBy: {
        due_date: 'desc'
      }
    });

    const formattedBills = billsContract.map(bill => ({
      invoice_receipt_id: bill.invoice_receipt_id,
      invoice_number: bill.invoice_number,
      bill_month: bill.bill_month,
      due_date: bill.due_date,
      total_amount: bill.total,
      status: bill.status,
      room_number: bill.rooms.room_number,
      dorm_name: bill.dormitories.name,
      items: bill.invoice_receipt_items.map(item => ({
        item_id: item.invoice_receipt_item_id,
        item_name: item.description,
        item_amount: item.amount,
        item_type: item.item_type
      }))
    }));

    res.status(200).json(formattedBills);
  } catch (error) {
    console.error("Error fetching bills by contract:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงบิลค้างชำระ" });
  }
};
