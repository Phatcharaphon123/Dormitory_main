const pool = require('../db');

/**
 * ดึงข้อมูลใบเสร็จการย้ายออกสำหรับแสดงผล
 */
const getMoveOutReceiptData = async (req, res) => {
  try {
    const { dormId, roomNumber } = req.params;

    console.log(`📋 [getMoveOutReceiptData] หอพัก: ${dormId}, ห้อง: ${roomNumber}`);

    // Query หลัก: ดึงข้อมู        t.sub_district as tenant_subdistrict,
    // Query หลัก: ดึงข้อมูลใบเสร็จการย้ายออก
    const mainQuery = `
      SELECT 
        t.subdistrict as tenant_subdistrict,
        t.district as tenant_district,
        t.province as tenant_province,
        CONCAT(
          COALESCE(t.address, ''),
          CASE WHEN t.subdistrict IS NOT NULL THEN CONCAT(' ตำบล', t.subdistrict) ELSE '' END,
          CASE WHEN t.district IS NOT NULL THEN CONCAT(' อำเภอ', t.district) ELSE '' END,
          CASE WHEN t.province IS NOT NULL THEN CONCAT(' จังหวัด', t.province) ELSE '' END
        ) as tenant_address,
        r.room_number,
        d.name as dorm_name,
        CONCAT(
          d.address,
          CASE WHEN d.subdistrict IS NOT NULL THEN CONCAT(' ตำบล', d.subdistrict) ELSE '' END,
          CASE WHEN d.district IS NOT NULL THEN CONCAT(' อำเภอ', d.district) ELSE '' END,
          CASE WHEN d.province IS NOT NULL THEN CONCAT(' จังหวัด', d.province) ELSE '' END
        ) as dorm_address,
        -- ข้อมูลสัญญา
        c.contract_id,
        c.contract_id as termination_id,
        c.termination_date as checkout_date,
        c.contract_start_date as checkin_date,
        c.monthly_rent,
        c.deposit_monthly,
        c.advance_amount,
        c.water_meter_start,
        c.electric_meter_start,
        c.water_meter_end,
        c.electric_meter_end,
        COALESCE(c.room_type_name, rt.room_type_name) as room_type,
        
        -- ข้อมูลผู้เช่า
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        t.phone_number as tenant_phone,
        t.id_card_number as tenant_id_number,
        t.address as tenant_address_main,
        t.subdistrict as tenant_subdistrict,
        t.district as tenant_district,
        t.province as tenant_province,
        CONCAT(COALESCE(t.address, ''), 
               CASE WHEN t.subdistrict IS NOT NULL THEN CONCAT(' ตำบล', t.subdistrict) ELSE '' END,
               CASE WHEN t.district IS NOT NULL THEN CONCAT(' อำเภอ', t.district) ELSE '' END,
               CASE WHEN t.province IS NOT NULL THEN CONCAT(' จังหวัด', t.province) ELSE '' END
              ) as tenant_address,
        
        -- ข้อมูลห้อง
        r.room_number,
        
        -- ข้อมูลหอพัก
        d.name as dorm_name,
        CONCAT(d.address,
               CASE WHEN d.subdistrict IS NOT NULL THEN CONCAT(' ตำบล', d.subdistrict) ELSE '' END,
               CASE WHEN d.district IS NOT NULL THEN CONCAT(' อำเภอ', d.district) ELSE '' END,
               CASE WHEN d.province IS NOT NULL THEN CONCAT(' จังหวัด', d.province) ELSE '' END
              ) as dorm_address,
        d.phone as dorm_phone,
        d.email as dorm_email,
        
        -- ข้อมูลใบเสร็จ
        mor.move_out_receipt_id,
        mor.receipt_number,
        mor.net_amount as final_amount,
        mor.receipt_date,
        mor.move_out_date,
        mor.receipt_note,
        mor.payment_method,
        
        c.termination_date as created_at
        
      FROM contracts c
      LEFT JOIN tenants t ON c.tenant_id = t.tenant_id
      LEFT JOIN rooms r ON c.room_id = r.room_id
      LEFT JOIN room_types rt ON c.room_type_id = rt.room_type_id
      LEFT JOIN dormitories d ON r.dorm_id = d.dorm_id
      LEFT JOIN move_out_receipts mor ON c.contract_id = mor.contract_id
      WHERE r.room_number = $1 AND d.dorm_id = $2 AND c.status = 'terminated'
      ORDER BY c.termination_date DESC
      LIMIT 1
    `;

    const mainResult = await pool.query(mainQuery, [roomNumber, dormId]);

    if (mainResult.rows.length === 0) {
      console.log('📝 ไม่พบข้อมูลการย้ายออกของห้องนี้');
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลการย้ายออกของห้องนี้'
      });
    }

    const moveOutData = mainResult.rows[0];
    console.log(`📊 ข้อมูลหลักที่พบ:`, {
      terminationId: moveOutData.termination_id,
      receiptId: moveOutData.move_out_receipt_id,
      receiptNumber: moveOutData.receipt_number,
      tenantName: moveOutData.tenant_name
    });

    // ดึงรายการ adjustments จาก move_out_receipt_items (ถ้ามีใบเสร็จ)
    let adjustments = [];
    if (moveOutData.move_out_receipt_id) {
      const adjustmentsQuery = `
        SELECT 
          mori.item_type as type,
          mori.description,
          mori.total_price as amount,
          mori.quantity as unit,
          mori.unit_price as price_per_unit
        FROM move_out_receipt_items mori
        WHERE mori.move_out_receipt_id = $1
        ORDER BY mori.move_out_receipt_item_id
      `;

      const adjustmentsResult = await pool.query(adjustmentsQuery, [moveOutData.move_out_receipt_id]);
      console.log(`📝 พบรายการปรับปรุง: ${adjustmentsResult.rows.length} รายการ`);

      adjustments = adjustmentsResult.rows.map(adj => ({
        type: adj.type,
        description: adj.description,
        amount: parseFloat(adj.amount || 0),
        unit: parseFloat(adj.unit || 1),
        price_per_unit: parseFloat(adj.price_per_unit || 0), // ใช้ snake_case
        pricePerUnit: parseFloat(adj.price_per_unit || 0)    // เพิ่ม camelCase version เผื่อ
      }));
    }

    // ดึงข้อมูล utility rates
    const utilityQuery = `
      SELECT water_rate, electricity_rate 
      FROM utility_rates 
      WHERE dorm_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const utilityResult = await pool.query(utilityQuery, [dormId]);
    const rates = utilityResult.rows[0] || { water_rate: 15, electricity_rate: 7 };

    // สร้างรายการ items สำหรับใบเสร็จจากข้อมูลที่บันทึกไว้แล้วใน move_out_receipt_items
    const items = [];

    // เพิ่มรายการจาก adjustments ที่บันทึกในฐานข้อมูลแล้ว
    adjustments.forEach(adj => {
      items.push({
        type: adj.type,
        description: adj.description,
        unit: adj.unit,
        price_per_unit: adj.price_per_unit,
        pricePerUnit: adj.pricePerUnit,
        amount: adj.amount
      });
    });

    // จัดรูปแบบข้อมูลสำหรับ frontend
    const receiptData = {
      // ข้อมูลใบเสร็จ
      terminationId: moveOutData.termination_id,
      receipt_number: moveOutData.receipt_number || `MO${moveOutData.termination_id}`,
      receiptNumber: moveOutData.receipt_number || `MO${moveOutData.termination_id}`,
      
      // ข้อมูลสัญญา - เพิ่มเพื่อการนำทาง
      contractId: moveOutData.contract_id,
      contract_id: moveOutData.contract_id,
      
      // ข้อมูลผู้เช่า
      tenantName: moveOutData.tenant_name || 'ไม่ระบุ',
      tenantPhone: moveOutData.tenant_phone || 'ไม่ระบุ',
      tenantAddress: moveOutData.tenant_address || 'ไม่ระบุ',
      tenantAddressMain: moveOutData.tenant_address_main || '',
      tenantSubdistrict: moveOutData.tenant_subdistrict || '',
      tenantDistrict: moveOutData.tenant_district || '',
      tenantProvince: moveOutData.tenant_province || '',
      tenantIdNumber: moveOutData.tenant_id_number || '',
      
      // ข้อมูลห้อง
      roomNumber: moveOutData.room_number,
      roomType: moveOutData.room_type || 'ไม่ระบุ',
      monthlyRent: parseFloat(moveOutData.monthly_rent || 0),
      
      // ข้อมูลวันที่
      checkoutDate: moveOutData.checkout_date || moveOutData.move_out_date,
      checkinDate: moveOutData.checkin_date,
      receiptDate: moveOutData.receipt_date || moveOutData.checkout_date,
      
      // ข้อมูลการเงิน
      deposit: parseFloat(moveOutData.deposit_monthly || 0),
      advance: parseFloat(moveOutData.advance_amount || 0),
      finalAmount: parseFloat(moveOutData.final_amount || 0),
      paymentMethod: moveOutData.payment_method || 'เงินสด',
      
      // ข้อมูลหอพัก
      dormName: moveOutData.dorm_name || 'หอพักไม่ระบุ',
      dormAddress: moveOutData.dorm_address || '',
      dormPhone: moveOutData.dorm_phone || '',
      dormEmail: moveOutData.dorm_email || '',
      
      // ข้อมูลมิเตอร์
      initialMeterReading: {
        water: moveOutData.water_meter_start || 0,
        electric: moveOutData.electric_meter_start || 0
      },
      currentMeterReading: {
        water: moveOutData.water_meter_end || 0,
        electric: moveOutData.electric_meter_end || 0
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
      receiptNote: moveOutData.receipt_note || 'ใบเสร็จการย้ายออกจากหอพัก',
      createdAt: moveOutData.created_at
    };

    console.log(`✅ ดึงข้อมูลใบเสร็จการย้ายออกสำเร็จ: ${receiptData.receiptNumber}`);

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
const getMoveOutReceiptById = async (req, res) => {
  try {
    const { moveOutReceiptId } = req.params;

    console.log(`📋 [getMoveOutReceiptById] move_out_receipt_id: ${moveOutReceiptId}`);

    // ตรวจสอบว่า moveOutReceiptId เป็นตัวเลขหรือไม่
    if (!/^\d+$/.test(moveOutReceiptId)) {
      return res.status(400).json({
        success: false,
        message: 'move_out_receipt_id ต้องเป็นตัวเลข'
      });
    }

    // Query หลัก: ดึงข้อมูลจาก move_out_receipts
    const mainQuery = `
      SELECT 
        -- ข้อมูลใบเสร็จ
        mor.move_out_receipt_id,
        mor.receipt_number,
        mor.contract_id,
        mor.receipt_date,
        mor.move_out_date,
        mor.net_amount as final_amount,
        mor.payment_method,
        mor.receipt_note,
        mor.created_at,
        
        -- ข้อมูลจาก contracts
        c.termination_date as checkout_date,
        c.contract_start_date as checkin_date,
        c.monthly_rent,
        c.deposit_monthly,
        c.advance_amount,
        c.water_meter_start,
        c.electric_meter_start,
        c.water_meter_end,
        c.electric_meter_end,
        COALESCE(c.room_type_name, rt.room_type_name) as room_type,
        
        -- ข้อมูลผู้เช่า
        CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
        t.phone_number as tenant_phone,
        t.id_card_number as tenant_id_number,
        t.address as tenant_address_main,
        t.subdistrict as tenant_subdistrict,
        t.district as tenant_district,
        t.province as tenant_province,
        CONCAT(COALESCE(t.address, ''), 
               CASE WHEN t.subdistrict IS NOT NULL THEN CONCAT(' ตำบล', t.subdistrict) ELSE '' END,
               CASE WHEN t.district IS NOT NULL THEN CONCAT(' อำเภอ', t.district) ELSE '' END,
               CASE WHEN t.province IS NOT NULL THEN CONCAT(' จังหวัด', t.province) ELSE '' END
              ) as tenant_address,
        
        -- ข้อมูลห้อง
        r.room_number,
        
        -- ข้อมูลหอพัก
        d.name as dorm_name,
        CONCAT(d.address,
               CASE WHEN d.subdistrict IS NOT NULL THEN CONCAT(' ตำบล', d.subdistrict) ELSE '' END,
               CASE WHEN d.district IS NOT NULL THEN CONCAT(' อำเภอ', d.district) ELSE '' END,
               CASE WHEN d.province IS NOT NULL THEN CONCAT(' จังหวัด', d.province) ELSE '' END
              ) as dorm_address,
        d.phone as dorm_phone,
        d.email as dorm_email,
        d.dorm_id
        
      FROM move_out_receipts mor
      LEFT JOIN contracts c ON mor.contract_id = c.contract_id
      LEFT JOIN tenants t ON c.tenant_id = t.tenant_id
      LEFT JOIN rooms r ON c.room_id = r.room_id
      LEFT JOIN room_types rt ON c.room_type_id = rt.room_type_id
      LEFT JOIN dormitories d ON r.dorm_id = d.dorm_id
      WHERE mor.move_out_receipt_id = $1
    `;

    const mainResult = await pool.query(mainQuery, [moveOutReceiptId]);

    if (mainResult.rows.length === 0) {
      console.log('📝 ไม่พบข้อมูลใบเสร็จการย้ายออก');
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อมูลใบเสร็จการย้ายออก'
      });
    }

    const moveOutData = mainResult.rows[0];
    console.log(`📊 ข้อมูลหลักที่พบ:`, {
      receiptId: moveOutData.move_out_receipt_id,
      receiptNumber: moveOutData.receipt_number,
      tenantName: moveOutData.tenant_name
    });

    // ดึงรายการ items จาก move_out_receipt_items
    const itemsQuery = `
      SELECT 
        mori.item_type as type,
        mori.description,
        mori.total_price as amount,
        mori.quantity as unit,
        mori.unit_price as price_per_unit
      FROM move_out_receipt_items mori
      WHERE mori.move_out_receipt_id = $1
      ORDER BY mori.move_out_receipt_item_id
    `;

    const itemsResult = await pool.query(itemsQuery, [moveOutReceiptId]);
    console.log(`📝 พบรายการในใบเสร็จ: ${itemsResult.rows.length} รายการ`);
    console.log('📝 Raw items data from database:', JSON.stringify(itemsResult.rows, null, 2));

    const items = itemsResult.rows.map(item => {
      console.log('🔧 Processing item from DB:', JSON.stringify(item, null, 2));
      
      // คำนวณ amount ตามประเภท
      let amount = parseFloat(item.amount || 0);
      if (item.type === 'refund') {
        amount = -Math.abs(amount); // refund ต้องเป็นลบ
      } else {
        amount = Math.abs(amount); // charge/penalty เป็นบวก
      }
      
      const processedItem = {
        type: item.type,
        description: item.description,
        unit: parseFloat(item.unit || 1),
        price_per_unit: parseFloat(item.price_per_unit || 0), // ใช้ price_per_unit ตรงกับ frontend
        pricePerUnit: parseFloat(item.price_per_unit || 0),   // เพิ่ม camelCase version เผื่อ
        amount: amount
      };
      console.log('🔧 Processed item:', JSON.stringify(processedItem, null, 2));
      return processedItem;
    });

    // ดึงข้อมูล utility rates
    const utilityQuery = `
      SELECT water_rate, electricity_rate 
      FROM utility_rates 
      WHERE dorm_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const utilityResult = await pool.query(utilityQuery, [moveOutData.dorm_id]);
    const rates = utilityResult.rows[0] || { water_rate: 15, electricity_rate: 7 };

    // จัดรูปแบบข้อมูลสำหรับ frontend
    const receiptData = {
      // ข้อมูลใบเสร็จ
      move_out_receipt_id: moveOutData.move_out_receipt_id,
      receipt_number: moveOutData.receipt_number || `MO${moveOutData.move_out_receipt_id}`,
      receiptNumber: moveOutData.receipt_number || `MO${moveOutData.move_out_receipt_id}`,
      
      // ข้อมูลสัญญา - เพิ่มเพื่อการนำทาง
      contractId: moveOutData.contract_id,
      contract_id: moveOutData.contract_id,
      
      // ข้อมูลผู้เช่า
      tenantName: moveOutData.tenant_name || 'ไม่ระบุ',
      tenantPhone: moveOutData.tenant_phone || 'ไม่ระบุ',
      tenantAddress: moveOutData.tenant_address || 'ไม่ระบุ',
      tenantAddressMain: moveOutData.tenant_address_main || '',
      tenantSubdistrict: moveOutData.tenant_subdistrict || '',
      tenantDistrict: moveOutData.tenant_district || '',
      tenantProvince: moveOutData.tenant_province || '',
      tenantIdNumber: moveOutData.tenant_id_number || '',
      
      // ข้อมูลห้อง
      roomNumber: moveOutData.room_number,
      roomType: moveOutData.room_type || 'ไม่ระบุ',
      monthlyRent: parseFloat(moveOutData.monthly_rent || 0),
      
      // ข้อมูลวันที่
      checkoutDate: moveOutData.checkout_date || moveOutData.move_out_date,
      checkinDate: moveOutData.checkin_date,
      receiptDate: moveOutData.receipt_date || moveOutData.checkout_date,
      
      // ข้อมูลการเงิน
      deposit: parseFloat(moveOutData.deposit_monthly || 0),
      advance: parseFloat(moveOutData.advance_amount || 0),
      finalAmount: parseFloat(moveOutData.final_amount || 0),
      paymentMethod: moveOutData.payment_method || 'เงินสด',
      
      // ข้อมูลหอพัก
      dormName: moveOutData.dorm_name || 'หอพักไม่ระบุ',
      dormAddress: moveOutData.dorm_address || '',
      dormPhone: moveOutData.dorm_phone || '',
      dormEmail: moveOutData.dorm_email || '',
      
      // ข้อมูลมิเตอร์
      initialMeterReading: {
        water: moveOutData.water_meter_start || 0,
        electric: moveOutData.electric_meter_start || 0
      },
      currentMeterReading: {
        water: moveOutData.water_meter_end || 0,
        electric: moveOutData.electric_meter_end || 0
      },
      
      // อัตราค่าสาธารณูปโภค
      rates: {
        water: parseFloat(rates.water_rate || 15),
        electric: parseFloat(rates.electricity_rate || 7)
      },
      
      // รายการทั้งหมด
      items: items,
      
      // อื่นๆ
      receiptNote: moveOutData.receipt_note || 'ใบเสร็จการย้ายออกจากหอพัก',
      createdAt: moveOutData.created_at
    };

    console.log(`✅ ดึงข้อมูลใบเสร็จการย้ายออกสำเร็จ: ${receiptData.receiptNumber}`);

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
const getMoveOutReceiptsByMonth = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { month, year } = req.query;

    console.log(`📋 [getMoveOutReceiptsByMonth] หอพัก: ${dormId}, เดือน: ${month}, ปี: ${year}`);

    // Query สำหรับดึงใบเสร็จการย้ายออก
    let query = `
      SELECT 
        mor.move_out_receipt_id as id,
        mor.move_out_receipt_id as "originalId",
        mor.receipt_number as "receiptNo",
        TRIM(CONCAT(t.first_name, ' ', t.last_name)) as payer,
        TO_CHAR(mor.receipt_date, 'DD/MM/YYYY') as "paymentDate",
        mor.receipt_date as "moveOutDate",
        r.room_number as room,
        CASE 
          WHEN mor.payment_method = 'เงินสด' THEN 'เงินสด'
          WHEN mor.payment_method = 'โอนเงิน' THEN 'โอนเงิน'
          ELSE 'เงินสด'
        END as channel,
        mor.net_amount as "totalAmount",
        mor.net_amount as "paidAmount",
        mor.net_amount as amount,
        'move_out' as "receiptType",
        CASE 
          WHEN mor.net_amount < 0 THEN true 
          ELSE false 
        END as "isRefund",
        'ชำระแล้ว' as status,
        mor.created_at as "createdAt",
        mor.created_at as "created_at"
      FROM move_out_receipts mor
      LEFT JOIN contracts c ON mor.contract_id = c.contract_id
      LEFT JOIN tenants t ON c.tenant_id = t.tenant_id
      LEFT JOIN rooms r ON c.room_id = r.room_id
      LEFT JOIN dormitories d ON r.dorm_id = d.dorm_id
      WHERE d.dorm_id = $1
    `;

    const params = [dormId];

    // เพิ่มเงื่อนไขเดือน/ปี ถ้ามีการระบุ
    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM mor.receipt_date) = $2 AND EXTRACT(YEAR FROM mor.receipt_date) = $3`;
      params.push(month, year);
    }

    query += ` ORDER BY mor.created_at DESC, mor.receipt_date DESC`;

    console.log('📋 [getMoveOutReceiptsByMonth] Query:', query);
    console.log('📋 [getMoveOutReceiptsByMonth] Params:', params);

    const result = await pool.query(query, params);
    const receipts = result.rows;

    console.log(`✅ [getMoveOutReceiptsByMonth] พบใบเสร็จการย้ายออก ${receipts.length} รายการ`);
    if (receipts.length > 0) {
      console.log(`🔍 [getMoveOutReceiptsByMonth] Sample receipt:`, receipts[0]);
    }

    res.json(receipts);

  } catch (error) {
    console.error('❌ [getMoveOutReceiptsByMonth] เกิดข้อผิดพลาด:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบเสร็จการย้ายออก',
      error: error.message
    });
  }
};

module.exports = {
  getMoveOutReceiptData,
  getMoveOutReceiptById,
  getMoveOutReceiptsByMonth
};
