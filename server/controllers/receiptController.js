const pool = require('../db');

// 📄 สร้างใบเสร็จสำหรับสัญญา
const createReceipt = async (req, res) => {
  const client = await pool.connect();
  
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

    await client.query('BEGIN');

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

    // สร้างใบเสร็จหลัก (ลบคอลัมน์ที่ซ้ำซ้อนออก)
    const receiptResult = await client.query(`
      INSERT INTO move_in_receipts (
        contract_id, receipt_number, total_amount, payment_method, 
        receipt_date, receipt_note
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING move_in_receipt_id
    `, [
      contractId, receiptNumber, totalAmount, payment_method,
      receipt_date, receipt_note
    ]);

    const receiptId = receiptResult.rows[0].move_in_receipt_id;

    // เพิ่มรายการในใบเสร็จ
    if (parseFloat(deposit_monthly || 0) > 0) {
      await client.query(`
        INSERT INTO move_in_receipt_items (move_in_receipt_id, item_type, description, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [receiptId, 'deposit', 'เงินประกัน', 1, deposit_monthly, deposit_monthly]);
    }

    if (parseFloat(advance_amount || 0) > 0) {
      await client.query(`
        INSERT INTO move_in_receipt_items (move_in_receipt_id, item_type, description, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [receiptId, 'advance', 'ค่าเช่าล่วงหน้า', 1, advance_amount, advance_amount]);
    }

    // เพิ่มบริการเพิ่มเติม
    if (services && services.length > 0) {
      for (const service of services) {
        await client.query(`
          INSERT INTO move_in_receipt_items (move_in_receipt_id, item_type, description, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          receiptId, 'service', service.description || service.name,
          service.quantity || 1, service.unitPrice || service.price || 0,
          service.price || 0
        ]);
      }
    }

    // เพิ่มส่วนลด (ถ้ามี)
    if (parseFloat(discount || 0) > 0) {
      await client.query(`
        INSERT INTO move_in_receipt_items (move_in_receipt_id, item_type, description, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [receiptId, 'discount', 'ส่วนลด', 1, -discount, -discount]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'สร้างใบเสร็จสำเร็จ',
      receipt_id: receiptId,
      receipt_number: receiptNumber,
      total_amount: totalAmount
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating receipt:', err);
    res.status(500).json({ error: 'Failed to create receipt: ' + err.message });
  } finally {
    client.release();
  }
};

// 📥 ดึงข้อมูลใบเสร็จ
const getReceipt = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    // ดึงข้อมูลใบเสร็จ
    const receiptResult = await pool.query(`
      SELECT 
        r.*,
        c.contract_start_date,
        t.first_name,
        t.last_name,
        t.phone_number,
        t.address,
        t.province,
        t.district,
        t.subdistrict,
        rm.room_number,
        rt.room_type_name as room_type,
        d.name as dorm_name,
        d.phone as dorm_phone,
        d.email as dorm_email,
        d.address as dorm_address,
        d.province as dorm_province,
        d.district as dorm_district,
        d.subdistrict as dorm_subdistrict
      FROM move_in_receipts r
      JOIN contracts c ON r.contract_id = c.contract_id
      JOIN tenants t ON c.tenant_id = t.tenant_id
      JOIN rooms rm ON c.room_id = rm.room_id
      LEFT JOIN room_types rt ON rm.room_type_id = rt.room_type_id
      JOIN dormitories d ON rm.dorm_id = d.dorm_id
      WHERE r.contract_id = $1
      ORDER BY r.created_at DESC
      LIMIT 1
    `, [contractId]);

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบใบเสร็จ' });
    }

    const receipt = receiptResult.rows[0];

    // ดึงรายการในใบเสร็จ
    const itemsResult = await pool.query(`
      SELECT item_type, description, quantity, unit_price, total_price
      FROM move_in_receipt_items
      WHERE move_in_receipt_id = $1
      ORDER BY 
        CASE item_type
          WHEN 'deposit' THEN 1
          WHEN 'advance' THEN 2
          WHEN 'service' THEN 3
          WHEN 'discount' THEN 4
        END,
        move_in_receipt_item_id
    `, [receipt.move_in_receipt_id]);

    // จัดรูปแบบข้อมูลส่งกลับ
    const response = {
      ...receipt,
      contract_services_id: receipt.move_in_receipt_id, // สำหรับ backward compatibility
      services: JSON.stringify(itemsResult.rows.filter(item => item.item_type === 'service').map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        price: item.total_price
      }))),
      all_items: itemsResult.rows
    };

    res.json(response);

  } catch (err) {
    console.error('Error fetching receipt:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// 📥 ดึงใบเสร็จทั้งหมดของหอพัก
const getReceiptsByDorm = async (req, res) => {
  try {
    const { dormId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        r.move_in_receipt_id as receipt_id,
        r.receipt_number,
        r.total_amount,
        r.payment_method,
        r.receipt_date,
        r.created_at,
        c.contract_start_date,
        t.first_name,
        t.last_name,
        rm.room_number
      FROM move_in_receipts r
      JOIN contracts c ON r.contract_id = c.contract_id
      JOIN tenants t ON c.tenant_id = t.tenant_id
      JOIN rooms rm ON c.room_id = rm.room_id
      WHERE rm.dorm_id = $1
      ORDER BY r.created_at DESC
    `, [dormId]);

    res.json(result.rows);

  } catch (err) {
    console.error('Error fetching receipts:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// 📄 ดึงหมายเหตุเริ่มต้นสำหรับใบเสร็จ (จากตาราง default_receipt_notes)
const getDefaultReceiptNote = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { receipt_type = 'move_out' } = req.query; // รับ receipt_type จาก query parameter
    
    // ดึง note_content จากตาราง default_receipt_notes ตาม receipt_type
    const result = await pool.query(`
      SELECT note_content 
      FROM default_receipt_notes 
      WHERE dorm_id = $1 AND receipt_type = $2
    `, [dormId, receipt_type]);
    
    // ถ้าไม่พบข้อมูล ให้ส่งค่าว่างกลับไป
    const noteContent = result.rows.length > 0 ? result.rows[0].note_content : '';
    
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
const saveDefaultReceiptNote = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { note_content, receipt_type = 'move_out' } = req.body; // รับ receipt_type จาก body
    
    console.log('📝 บันทึกหมายเหตุเริ่มต้น:', {
      dormId,
      receipt_type,
      note_content: note_content?.substring(0, 50) + '...'
    });
    
    // บันทึกหรืออัปเดตหมายเหตุเริ่มต้นในตาราง default_receipt_notes
    const result = await pool.query(`
      INSERT INTO default_receipt_notes (dorm_id, receipt_type, note_content, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (dorm_id, receipt_type) 
      DO UPDATE SET note_content = $3, updated_at = NOW()
      RETURNING note_content, receipt_type
    `, [dormId, receipt_type, note_content || '']);
    
    console.log('✅ บันทึกหมายเหตุสำเร็จ:', result.rows[0]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่สามารถบันทึกหมายเหตุได้' });
    }
    
    res.json({ 
      message: 'บันทึกหมายเหตุเริ่มต้นสำเร็จ',
      note_content: result.rows[0].note_content,
      receipt_type: result.rows[0].receipt_type,
      dorm_id: dormId
    });
  } catch (error) {
    console.error('❌ Error saving default receipt note:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail
    });
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกหมายเหตุเริ่มต้น' });
  }
};

// 📝 บันทึกหมายเหตุใบเสร็จโดยตรงลงตาราง receipts
const saveReceiptNote = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { receipt_note } = req.body;

    // ตรวจสอบว่ามีใบเสร็จสำหรับสัญญานี้หรือไม่
    const checkResult = await pool.query('SELECT move_in_receipt_id FROM move_in_receipts WHERE contract_id = $1', [contractId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบใบเสร็จสำหรับสัญญานี้' });
    }

    // อัปเดตหมายเหตุในใบเสร็จ
    await pool.query('UPDATE move_in_receipts SET receipt_note = $1 WHERE contract_id = $2', [receipt_note, contractId]);

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
const saveReceiptNoteForRoom = async (req, res) => {
  try {
    const { dormId, roomNumber } = req.params;
    const { receipt_note } = req.body;

    // ตรวจสอบว่ามีสัญญาปัจจุบันสำหรับห้องนี้หรือไม่
    const contractResult = await pool.query(
      `SELECT c.contract_id FROM contracts c 
       JOIN rooms r ON c.room_id = r.room_id 
       WHERE r.dorm_id = $1 AND r.room_number = $2 AND c.status = $3 
       ORDER BY c.contract_start_date DESC LIMIT 1`,
      [dormId, roomNumber, 'active']
    );

    if (contractResult.rows.length === 0) {
      // ถ้าไม่มีสัญญาปัจจุบัน ให้บันทึกลง default note แทน (ใช้ receipt_type = 'monthly' เป็นค่าเริ่มต้น)
      const result = await pool.query(`
        INSERT INTO default_receipt_notes (dorm_id, receipt_type, note_content, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (dorm_id, receipt_type) 
        DO UPDATE SET note_content = $3, updated_at = NOW()
        RETURNING note_content
      `, [dormId, 'monthly', receipt_note]);

      return res.status(200).json({ 
        message: 'บันทึกหมายเหตุเริ่มต้นสำเร็จ',
        receipt_note: result.rows[0].note_content,
        type: 'default'
      });
    }

    const contractId = contractResult.rows[0].contract_id;

    // ตรวจสอบว่ามีใบเสร็จสำหรับสัญญานี้หรือไม่
    const receiptResult = await pool.query('SELECT move_in_receipt_id FROM move_in_receipts WHERE contract_id = $1', [contractId]);
    
    if (receiptResult.rows.length === 0) {
      // ถ้าไม่มีใบเสร็จ ให้บันทึกลง default note แทน (ใช้ receipt_type = 'monthly' เป็นค่าเริ่มต้น)
      const result = await pool.query(`
        INSERT INTO default_receipt_notes (dorm_id, receipt_type, note_content, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (dorm_id, receipt_type) 
        DO UPDATE SET note_content = $3, updated_at = NOW()
        RETURNING note_content
      `, [dormId, 'monthly', receipt_note]);

      return res.status(200).json({ 
        message: 'บันทึกหมายเหตุเริ่มต้นสำเร็จ (จะใช้สำหรับใบเสร็จใหม่)',
        receipt_note: result.rows[0].note_content,
        type: 'default'
      });
    }

    // อัปเดตหมายเหตุในใบเสร็จ
    await pool.query('UPDATE move_in_receipts SET receipt_note = $1 WHERE contract_id = $2', [receipt_note, contractId]);

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

module.exports = {
  createReceipt,
  getReceipt,
  getReceiptsByDorm,
  getDefaultReceiptNote,
  saveDefaultReceiptNote,
  saveReceiptNote,
  saveReceiptNoteForRoom
};
