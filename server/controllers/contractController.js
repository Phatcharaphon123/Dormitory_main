const pool = require('../db');

// 📄 สร้างสัญญาใหม่พร้อมข้อมูลผู้เช่า
exports.createContract = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { dormId, roomNumber } = req.params;
    const {
      // ข้อมูลผู้เช่า
      first_name, last_name, phone_number, email, id_card_number, address, province, district, subdistrict,
      // ข้อมูลติดต่อฉุกเฉิน
      emergency_contact,
      // ข้อมูลยานพาหนะ
      vehicles,
      // ข้อมูลสัญญา
      contract_start_date, contract_end_date, deposit_monthly, advance_amount, monthly_rent,
      water_meter_start, electric_meter_start, moveout_notice_date,
      // บริการเพิ่มเติม
      services,
      // หมายเหตุ
      note,
      // ชื่อประเภทห้อง
      room_type_name
    } = req.body;

    await client.query('BEGIN');

    // 1. ดึงข้อมูลห้องพัก
    const roomResult = await client.query(
      'SELECT room_id, room_type_id FROM rooms WHERE room_number = $1 AND dorm_id = $2',
      [roomNumber, dormId]
    );

    if (roomResult.rows.length === 0) {
      throw new Error('ไม่พบห้องที่ระบุ');
    }

    const roomId = roomResult.rows[0].room_id;
    const roomTypeId = roomResult.rows[0].room_type_id;

    // ดึงชื่อประเภทห้องจากฐานข้อมูลหากไม่ได้ส่งมาจาก frontend
    let finalRoomTypeName = room_type_name;
    if (!finalRoomTypeName && roomTypeId) {
      const roomTypeResult = await client.query(
        'SELECT room_type_name FROM room_types WHERE room_type_id = $1',
        [roomTypeId]
      );
      finalRoomTypeName = roomTypeResult.rows[0]?.room_type_name || null;
    }

    // 2. สร้างข้อมูลผู้เช่า
    const tenantResult = await client.query(`
      INSERT INTO tenants (room_id, first_name, last_name, phone_number, email, id_card_number, address, province, district, subdistrict, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING tenant_id
    `, [roomId, first_name, last_name, phone_number, email, id_card_number, address, province || null, district || null, subdistrict || null, note]);

    const tenantId = tenantResult.rows[0].tenant_id;

    // 3. เพิ่มผู้ติดต่อฉุกเฉิน
    if (emergency_contact) {
    await client.query(`
      INSERT INTO tenant_emergency_contacts (tenant_id, first_name, last_name, phone_number, relationship)
      VALUES ($1, $2, $3, $4, $5)
    `, [tenantId, emergency_contact.first_name, emergency_contact.last_name, emergency_contact.phone_number, emergency_contact.relationship]);
    }

    // 4. เพิ่มยานพาหนะ (ถ้ามี)
    if (vehicles && vehicles.length > 0) {
      for (const vehicle of vehicles) {
        await client.query(`
          INSERT INTO tenant_vehicles (tenant_id, vehicle_type, license_plate)
          VALUES ($1, $2, $3)
        `, [tenantId, vehicle.vehicle_type, vehicle.license_plate]);
      }
    }

    // 5. สร้างสัญญา
    console.log('📝 กำลังสร้างสัญญาด้วยข้อมูล:', {
      tenantId, roomId, roomTypeId, 
      contract_start_date, contract_end_date, 
      deposit_monthly, advance_amount, monthly_rent,
      water_meter_start, electric_meter_start, 
      moveout_notice_date, finalRoomTypeName
    });
    
    const contractResult = await client.query(`
      INSERT INTO contracts (
        tenant_id, room_id, room_type_id, 
        contract_start_date, contract_end_date, 
        deposit_monthly, advance_amount, monthly_rent,
        water_meter_start, electric_meter_start, 
        status, moveout_notice_date, room_type_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING contract_id
    `, [
      tenantId, roomId, roomTypeId, 
      contract_start_date, contract_end_date, 
      deposit_monthly, advance_amount, monthly_rent || 0,
      water_meter_start, electric_meter_start, 
      'active', moveout_notice_date, finalRoomTypeName
    ]);

    const contractId = contractResult.rows[0].contract_id;

    // 6. ข้ามการเพิ่มรายการค่าใช้จ่ายใน contracts_services (ใช้ move_in_receipt_items แทน)
    // move_in_receipt_items จะถูกสร้างโดย API แยกต่างหาก

    // 7. อัปเดตสถานะห้อง
    await client.query(
      'UPDATE rooms SET available = false, status_id = 2 WHERE room_id = $1',
      [roomId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'สร้างสัญญาสำเร็จ',
      contract_id: contractId,
      tenant_id: tenantId
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating contract:', err);
    res.status(500).json({ error: 'Failed to create contract: ' + err.message });
  } finally {
    client.release();
  }
};

// 📥 ดึงสัญญาทั้งหมดของหอพัก
exports.getContractsByDorm = async (req, res) => {
  try {
    const { dormId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        c.*,
        t.first_name, t.last_name, t.phone_number, t.email,
        r.room_number, r.floor_number,
        COALESCE(c.room_type_name, rt.room_type_name) as room_type_name, rt.monthly_rent,
        -- ใช้ข้อมูลจาก monthly_service แทน contracts_services
        COALESCE(
          json_agg(
            json_build_object(
              'service_id', ms.monthly_service_id,
              'name', ms.service_name,
              'price', ms.service_price,
              'quantity', ms.quantity,
              'is_active', ms.is_active
            )
          ) FILTER (WHERE ms.monthly_service_id IS NOT NULL), 
          '[]'::json
        ) as services
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.tenant_id
      JOIN rooms r ON c.room_id = r.room_id
      LEFT JOIN room_types rt ON c.room_type_id = rt.room_type_id
      LEFT JOIN monthly_service ms ON c.contract_id = ms.contract_id AND ms.is_active = true
      WHERE r.dorm_id = $1
      GROUP BY c.contract_id, t.tenant_id, r.room_id, rt.room_type_id
      ORDER BY r.room_number
    `, [dormId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching contracts:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// 📥 ดึงรายละเอียดสัญญาเฉพาะ
exports.getContractDetail = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        c.*,
        t.first_name, t.last_name, t.phone_number, t.email, t.id_card_number, t.address, t.province, t.district, t.subdistrict, t.note,
        r.room_number, r.floor_number, r.dorm_id,
        COALESCE(c.room_type_name, rt.room_type_name) as room_type_name, rt.monthly_rent,
        d.name as dorm_name,
        MAX(ec.first_name) as emergency_first_name,
        MAX(ec.last_name) as emergency_last_name,
        MAX(ec.phone_number) as emergency_phone,
        MAX(ec.relationship) as emergency_relationship,
        MAX(ec.emergency_contacts_id) as emergency_contacts_id,
        COALESCE(
          json_agg(
            json_build_object(
              'tenant_vehicle_id', tv.tenant_vehicle_id,
              'vehicle_type', tv.vehicle_type,
              'license_plate', tv.license_plate
            )
          ) FILTER (WHERE tv.tenant_vehicle_id IS NOT NULL), 
          '[]'::json
        ) as vehicles
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.tenant_id
      JOIN rooms r ON c.room_id = r.room_id
      JOIN dormitories d ON r.dorm_id = d.dorm_id
      LEFT JOIN room_types rt ON c.room_type_id = rt.room_type_id
      LEFT JOIN tenant_emergency_contacts ec ON t.tenant_id = ec.tenant_id
      LEFT JOIN tenant_vehicles tv ON t.tenant_id = tv.tenant_id
      WHERE c.contract_id = $1
      GROUP BY c.contract_id, t.tenant_id, r.room_id, d.dorm_id, rt.room_type_name, rt.monthly_rent
    `, [contractId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบสัญญาที่ระบุ' });
    }

    // ข้ามการดึงบริการจาก contracts_services (ใช้ monthly_service แทน)
    const contractData = result.rows[0];
    
    res.json(contractData);
  } catch (err) {
    console.error('Error fetching contract detail:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// 🏠 ดึงสัญญาของห้องเฉพาะ
exports.getContractByRoom = async (req, res) => {
  try {
    const { dormId, roomNumber } = req.params;
    
    // ดึงข้อมูลสัญญาหลัก
    const result = await pool.query(`
      SELECT 
        c.*,
        t.first_name, t.last_name, t.phone_number, t.email,
        r.room_number, r.floor_number,
        COALESCE(c.room_type_name, rt.room_type_name) as room_type_name, rt.monthly_rent
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.tenant_id
      JOIN rooms r ON c.room_id = r.room_id
      LEFT JOIN room_types rt ON c.room_type_id = rt.room_type_id
      WHERE r.dorm_id = $1 AND r.room_number = $2 AND c.status = 'active'
      ORDER BY c.created_at DESC
      LIMIT 1
    `, [dormId, roomNumber]);
    
    if (result.rows.length === 0) {
      console.log('No active contract found for room');
      return res.status(404).json({ error: 'ไม่พบสัญญาที่ยังใช้งานในห้องนี้' });
    }

    const contractData = result.rows[0];
    
    // ดึงข้อมูลมิเตอร์ล่าสุดจากตาราง meter_readings
    const latestMeterQuery = `
      SELECT 
        mr.water_curr as latest_water_meter,
        mr.electric_curr as latest_electric_meter,
        mr.created_at as meter_read_date
      FROM meter_readings mr
      JOIN meter_records rec ON mr.meter_record_id = rec.meter_record_id
      WHERE mr.room_id = $1 AND rec.dorm_id = $2
      ORDER BY rec.meter_record_date DESC, mr.created_at DESC
      LIMIT 1
    `;
    
    const meterResult = await pool.query(latestMeterQuery, [contractData.room_id, dormId]);
    
    if (meterResult.rows.length > 0) {
      // ใช้ข้อมูลมิเตอร์ล่าสุดจาก meter_readings
      contractData.water_meter_start = meterResult.rows[0].latest_water_meter || contractData.water_meter_start;
      contractData.electric_meter_start = meterResult.rows[0].latest_electric_meter || contractData.electric_meter_start;
      contractData.latest_meter_read_date = meterResult.rows[0].meter_read_date;
    } else {
      console.log('⚠️ ไม่พบข้อมูลมิเตอร์ใน meter_readings ใช้ค่าเริ่มต้นจากสัญญา');
    }

    // ดึงข้อมูล utility rates ล่าสุด
    const ratesQuery = `
      SELECT water_rate, electricity_rate 
      FROM utility_rates 
      WHERE dorm_id = $1 
      ORDER BY start_date DESC 
      LIMIT 1
    `;
    
    const ratesResult = await pool.query(ratesQuery, [dormId]);
    
    if (ratesResult.rows.length > 0) {
      contractData.rates = {
        water: ratesResult.rows[0].water_rate,
        electric: ratesResult.rows[0].electricity_rate
      };
    }

    console.log('Contract data with latest meter readings:', contractData);
    res.json(contractData);
  } catch (err) {
    console.error('Error fetching room contract:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateContract = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { contractId } = req.params;
    const { contract_start_date, contract_end_date, moveout_notice_date } = req.body;

    await client.query('BEGIN');

    // 🔍 1. ดึงค่าปัจจุบัน
    const existingResult = await client.query(
      'SELECT moveout_notice_date FROM contracts WHERE contract_id = $1',
      [contractId]
    );

    if (existingResult.rows.length === 0) {
      throw new Error('ไม่พบสัญญาที่ต้องการอัปเดต');
    }

    const oldMoveoutDate = existingResult.rows[0].moveout_notice_date;
    const newMoveoutDate = moveout_notice_date || null;

    const formatDate = (date) =>
      date ? new Date(date).toISOString().split('T')[0] : null;

    const oldDateFormatted = formatDate(oldMoveoutDate);
    const newDateFormatted = formatDate(newMoveoutDate);

    const hasChanged = oldDateFormatted !== newDateFormatted;

    // ✅ สร้าง query ตามเงื่อนไข
    let updateQuery = `
      UPDATE contracts SET 
        contract_start_date = $1,
        contract_end_date = $2,
        moveout_notice_date = $3,
        updated_at = NOW()
    `;
    const params = [
      contract_start_date,
      contract_end_date,
      newMoveoutDate,
    ];

    if (newMoveoutDate === null) {
      // ❌ ไม่มีวันที่ย้าย → ล้าง notice_created_at ด้วย
      updateQuery += `, notice_created_at = NULL`;
    } else if (hasChanged) {
      // ✅ วันที่ย้ายมีการเปลี่ยน → อัปเดต notice_created_at
      updateQuery += `, notice_created_at = NOW()`;
    }
    // else → ไม่มีการเปลี่ยนแปลง → ไม่แตะต้อง notice_created_at

    updateQuery += ` WHERE contract_id = $4 RETURNING *`;
    params.push(contractId);

    const result = await client.query(updateQuery, params);

    await client.query('COMMIT');

    res.json({
      message: 'อัปเดตข้อมูลสัญญาสำเร็จ',
      contract: result.rows[0],
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating contract:', err);
    res.status(500).json({ error: 'Failed to update contract: ' + err.message });
  } finally {
    client.release();
  }
};

// 🚪 ยกเลิกสัญญา/ย้ายออก (รวมข้อมูล termination และ move_out_receipt)
exports.terminateContract = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { contractId } = req.params;
    const { 
      termination_date,
      water_meter_end,
      electric_meter_end,
      adjustments = [],
      paymentMethod = 'เงินสด',
      finalAmount = 0,
      note = '',
      depositRefund = 0,
      isDepositRefund = false
    } = req.body;

    await client.query('BEGIN');

    // อัปเดตสถานะสัญญาและข้อมูล termination
    // แยก parameter เพื่อแก้ปัญหา type mismatch
    const terminationTimestamp = new Date(termination_date).toISOString();
    const contractEndDate = new Date(termination_date).toISOString().split('T')[0];
    
    const contractResult = await client.query(`
      UPDATE contracts SET 
        status = 'terminated',
        termination_date = $1::timestamp,
        contract_end_date = $2::date,
        water_meter_end = $3,
        electric_meter_end = $4,
        updated_at = NOW()
      WHERE contract_id = $5
      RETURNING room_id, tenant_id, contract_start_date, monthly_rent, deposit_monthly, advance_amount
    `, [terminationTimestamp, contractEndDate, water_meter_end, electric_meter_end, contractId]);

    if (contractResult.rows.length === 0) {
      throw new Error('ไม่พบสัญญาที่ต้องการยกเลิก');
    }

    const { room_id, tenant_id } = contractResult.rows[0];

    // สร้าง receipt number รูปแบบ MO{YYYYMMDD}{สุ่ม2ตัว} เช่น MO2025090804
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const receiptNumber = `MO${dateStr}${randomNum}`;
    
    const moveOutReceiptResult = await client.query(`
      INSERT INTO move_out_receipts (
        contract_id, receipt_number, receipt_date, move_out_date,
        payment_method, net_amount, receipt_note, created_at
      ) VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, NOW())
      RETURNING move_out_receipt_id
    `, [
      contractId, receiptNumber, contractEndDate, contractEndDate,
      paymentMethod, finalAmount, note
    ]);

    const moveOutReceiptId = moveOutReceiptResult.rows[0].move_out_receipt_id;

    // สร้าง move_out_receipt_items สำหรับแต่ละ adjustment
    let calculatedNetAmount = 0;
    if (adjustments && adjustments.length > 0) {
      for (const adjustment of adjustments) {
        const amount = adjustment.amount || 0;
        const itemType = adjustment.type || 'service';
        
        // คำนวณ net_amount: charge/meter/penalty = บวก, refund = ลบ
        if (itemType === 'charge' || itemType === 'meter' || itemType === 'penalty') {
          calculatedNetAmount += amount;
        } else if (itemType === 'refund') {
          calculatedNetAmount -= amount;
        }
        
        await client.query(`
          INSERT INTO move_out_receipt_items (
            move_out_receipt_id, item_type, description, 
            quantity, unit_price, total_price, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          moveOutReceiptId,
          itemType,
          adjustment.description || 'รายการไม่ระบุ',
          adjustment.unit || 1,
          adjustment.pricePerUnit || amount,
          amount
        ]);
      }
      // อัปเดต net_amount ในตาราง move_out_receipts ด้วยค่าที่คำนวณใหม่
      await client.query(`
        UPDATE move_out_receipts 
        SET net_amount = $1
        WHERE move_out_receipt_id = $2
      `, [calculatedNetAmount, moveOutReceiptId]);
    }

    // อัปเดตสถานะห้อง (ว่าง)
    await client.query(`
      UPDATE rooms SET 
        available = true,
        status_id = 1
      WHERE room_id = $1
    `, [room_id]);

    // หยุดบริการรายเดือนทั้งหมด
    await client.query(`
      UPDATE monthly_service 
      SET is_active = false, updated_at = NOW()
      WHERE contract_id = $1
    `, [contractId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'ยกเลิกสัญญาสำเร็จ',
      data: {
        contract_id: contractId,
        tenant_id: tenant_id,
        room_id: room_id,
        receiptNumber: receiptNumber,
        moveOutReceiptId: moveOutReceiptId,
        terminationId: contractId // เพิ่ม terminationId สำหรับ frontend
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error terminating contract:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to terminate contract: ' + err.message 
    });
  } finally {
    client.release();
  }
};

// 📋 ดึงรายการสัญญาที่ยกเลิกแล้ว (Terminated Contracts)
exports.getTerminatedContracts = async (req, res) => {
  try {
    const { dormId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        c.*,
        t.first_name, t.last_name, t.phone_number, t.email,
        r.room_number, r.floor_number,
        COALESCE(c.room_type_name, rt.room_type_name) as room_type_name,
        c.water_meter_start,
        c.electric_meter_start,
        c.water_meter_end,
        c.electric_meter_end,
        (c.water_meter_end - c.water_meter_start) as water_usage,
        (c.electric_meter_end - c.electric_meter_start) as electric_usage
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.tenant_id
      JOIN rooms r ON c.room_id = r.room_id
      LEFT JOIN room_types rt ON c.room_type_id = rt.room_type_id
      WHERE r.dorm_id = $1 AND c.status = 'terminated'
      ORDER BY c.updated_at DESC, c.termination_date DESC
    `, [dormId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching terminated contracts:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// 📋 ดึงรายละเอียดสัญญาที่ยกเลิกแล้ว
exports.getTerminatedContractDetail = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        c.*,
        t.first_name, t.last_name, t.phone_number, t.email, t.id_card_number,
        r.room_number, r.floor_number, r.dorm_id,
        COALESCE(c.room_type_name, rt.room_type_name) as room_type_name,
        d.name as dorm_name,
        (c.water_meter_end - c.water_meter_start) as water_usage,
        (c.electric_meter_end - c.electric_meter_start) as electric_usage,
        mor.move_out_receipt_id,
        ec.first_name as emergency_first_name,
        ec.last_name as emergency_last_name,
        ec.phone_number as emergency_phone,
        ec.relationship as emergency_relationship
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.tenant_id
      JOIN rooms r ON c.room_id = r.room_id
      JOIN dormitories d ON r.dorm_id = d.dorm_id
      LEFT JOIN room_types rt ON c.room_type_id = rt.room_type_id
      LEFT JOIN move_out_receipts mor ON c.contract_id = mor.contract_id
      LEFT JOIN tenant_emergency_contacts ec ON t.tenant_id = ec.tenant_id
      WHERE c.contract_id = $1 AND c.status = 'terminated'
    `, [contractId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบสัญญาที่ยกเลิกแล้วที่ระบุ' });
    }

    const data = result.rows[0];
    
    // ดึงข้อมูลยานพาหนะแยกต่างหาก
    const vehicleResult = await pool.query(`
      SELECT license_plate, vehicle_type 
      FROM tenant_vehicles 
      WHERE tenant_id = $1
    `, [data.tenant_id]);
    
    // จัดกลุ่มยานพาหนะตามประเภท
    const vehicles = vehicleResult.rows.reduce((acc, vehicle) => {
      if (vehicle.vehicle_type === 'car') {
        acc.car.plates.push(vehicle.license_plate);
      } else if (vehicle.vehicle_type === 'motorcycle') {
        acc.motorcycle.plates.push(vehicle.license_plate);
      }
      return acc;
    }, {
      car: { has: false, plates: [] },
      motorcycle: { has: false, plates: [] }
    });
    
    // อัปเดตสถานะ has
    vehicles.car.has = vehicles.car.plates.length > 0;
    vehicles.motorcycle.has = vehicles.motorcycle.plates.length > 0;
    
    // จัดโครงสร้างข้อมูลให้ตรงกับที่ frontend คาดหวัง
    const formattedData = {
      move_out_receipt_id: data.move_out_receipt_id,
      contract: {
        checkInDate: data.contract_start_date,
        checkOutDate: data.termination_date || data.contract_end_date,
        monthlyRent: parseFloat(data.monthly_rent) || 0,
        deposit: parseFloat(data.deposit_monthly) || 0,
        advance: parseFloat(data.advance_amount) || 0
      },
      tenant: {
        fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        phone: data.phone_number || '',
        email: data.email || '',
        idNumber: data.id_card_number || '',
        emergencyContact: {
          name: data.emergency_first_name && data.emergency_last_name 
            ? `${data.emergency_first_name} ${data.emergency_last_name}`.trim()
            : 'ไม่ระบุ',
          relationship: data.emergency_relationship || 'ไม่ระบุ',
          phone: data.emergency_phone || 'ไม่ระบุ'
        },
        vehicleData: vehicles
      },
      room: {
        number: data.room_number,
        type: data.room_type_name
      },
      meters: {
        water: {
          start: data.water_meter_start || 0,
          end: data.water_meter_end || 0,
          usage: Math.abs(data.water_usage) || 0
        },
        electric: {
          start: data.electric_meter_start || 0,
          end: data.electric_meter_end || 0,
          usage: Math.abs(data.electric_usage) || 0
        }
      },
      termination: {
        status: 'ย้ายออกแล้ว',
        notes: '',
        createdAt: data.updated_at
      }
    };

    res.json(formattedData);
  } catch (err) {
    console.error('Error fetching terminated contract detail:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

exports.getMoveoutList = async (req, res) => {
  try {
    const { dormId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        c.contract_id AS contract_id,
        r.room_number,
        t.first_name,
        t.last_name,
        t.phone_number,
        c.notice_created_at,
        c.moveout_notice_date,
        c.status
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.tenant_id
      JOIN rooms r ON c.room_id = r.room_id
      WHERE c.moveout_notice_date IS NOT NULL
        AND c.status != 'terminated'
        AND r.dorm_id = $1
      ORDER BY c.moveout_notice_date ASC
    `, [dormId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching moveout list:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.cancelMoveoutNotice = async (req, res) => {
  const { contractId } = req.params;

  try {
    const result = await pool.query(`
      UPDATE contracts SET 
        moveout_notice_date = NULL,
        notice_created_at = NULL,
        updated_at = NOW(),
        status = 'active'
      WHERE contract_id = $1
      RETURNING *
    `, [contractId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบสัญญาที่ต้องการยกเลิกแจ้งย้าย' });
    }

    res.json({
      message: 'ยกเลิกการแจ้งย้ายออกสำเร็จ',
      contract: result.rows[0],
    });

  } catch (err) {
    console.error('Error cancelling moveout notice:', err);
    res.status(500).json({ error: 'Failed to cancel moveout notice: ' + err.message });
  }
};

/* ─────────────── 🔹 CONTRACT SERVICES FUNCTIONS ─────────────── */

// ดึงบริการรายเดือนของสัญญา
exports.getContractServices = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        monthly_service_id as id,
        service_name as name,
        service_price as price,
        quantity,
        is_active
      FROM monthly_service 
      WHERE contract_id = $1 AND is_active = true
      ORDER BY created_at ASC
    `, [contractId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error getting contract services:', err);
    res.status(500).json({ error: 'Failed to get contract services: ' + err.message });
  }
};

// เพิ่มบริการรายเดือนใหม่
exports.addContractService = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { name, price, quantity = 1 } = req.body;

    if (!name || !price || price <= 0) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อบริการและราคาที่ถูกต้อง' });
    }

    const result = await pool.query(`
      INSERT INTO monthly_service (contract_id, service_name, service_price, quantity)
      VALUES ($1, $2, $3, $4)
      RETURNING 
        monthly_service_id as id,
        service_name as name,
        service_price as price,
        quantity
    `, [contractId, name, price, quantity]);

    res.status(201).json({
      message: 'เพิ่มบริการเรียบร้อย',
      service: result.rows[0]
    });
  } catch (err) {
    console.error('Error adding contract service:', err);
    res.status(500).json({ error: 'Failed to add contract service: ' + err.message });
  }
};

// แก้ไขบริการรายเดือน
exports.updateContractService = async (req, res) => {
  try {
    const { contractId, serviceId } = req.params;
    const { name, price, quantity = 1 } = req.body;

    if (!name || !price || price <= 0) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อบริการและราคาที่ถูกต้อง' });
    }

    const result = await pool.query(`
      UPDATE monthly_service 
      SET service_name = $1, service_price = $2, quantity = $3, updated_at = CURRENT_TIMESTAMP
      WHERE monthly_service_id = $4 AND contract_id = $5
      RETURNING 
        monthly_service_id as id,
        service_name as name,
        service_price as price,
        quantity
    `, [name, price, quantity, serviceId, contractId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบบริการที่ระบุ' });
    }

    res.json({
      message: 'แก้ไขบริการเรียบร้อย',
      service: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating contract service:', err);
    res.status(500).json({ error: 'Failed to update contract service: ' + err.message });
  }
};

// ลบบริการรายเดือน
exports.deleteContractService = async (req, res) => {
  try {
    const { contractId, serviceId } = req.params;

    const result = await pool.query(`
      UPDATE monthly_service 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE monthly_service_id = $1 AND contract_id = $2
      RETURNING monthly_service_id
    `, [serviceId, contractId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบบริการที่ระบุ' });
    }

    res.json({ message: 'ลบบริการเรียบร้อย' });
  } catch (err) {
    console.error('Error deleting contract service:', err);
    res.status(500).json({ error: 'Failed to delete contract service: ' + err.message });
  }
};