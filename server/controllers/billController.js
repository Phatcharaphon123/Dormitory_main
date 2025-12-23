const pool = require("../db");
const emailService = require("../services/emailService");

// ดึงรอบจดมิเตอร์ทั้งหมดของหอพัก
exports.getMeterRecordsByDorm = async (req, res) => {
  const { dormId } = req.params;
  const user_id = req.user.user_id;

  try {
    // ตรวจสอบว่าหอพักเป็นของ user ที่ login
    const ownershipCheck = await pool.query(
      "SELECT dorm_id FROM dormitories WHERE dorm_id = $1 AND user_id = $2",
      [dormId, user_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Access denied: ไม่สามารถเข้าถึงข้อมูลหอพักนี้ได้" });
    }

    const result = await pool.query(
      `SELECT meter_record_id, meter_record_date
       FROM meter_records
       WHERE dorm_id = $1
       ORDER BY meter_record_date DESC`,
      [dormId]
    );

    // แปลงวันที่เป็น YYYY-MM-DD ตามเวลาไทย
    const formatted = result.rows.map((row) => ({
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
    const ownershipCheck = await pool.query(
      "SELECT dorm_id FROM dormitories WHERE dorm_id = $1 AND user_id = $2",
      [dormId, user_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Access denied: ไม่สามารถเข้าถึงข้อมูลหอพักนี้ได้" });
    }

    const result = await pool.query(
      `
        WITH active_contracts_in_period AS (
          SELECT DISTINCT ON (c.room_id) 
            c.room_id, 
            c.tenant_id, 
            c.status as contract_status,
            t.first_name,
            t.last_name
          FROM contracts c
          JOIN tenants t ON c.tenant_id = t.tenant_id
          JOIN meter_records mr ON mr.meter_record_id = $1
          WHERE c.contract_start_date <= mr.meter_record_date
            AND (c.contract_end_date IS NULL OR c.contract_end_date >= mr.meter_record_date)
            AND c.status = 'active'
          ORDER BY c.room_id, c.contract_start_date DESC
        )
        SELECT 
          r.room_id,
          r.room_number,
          r.floor_number AS floor,
          r.room_type_id,
          COALESCE(ac.tenant_id) as tenant_id,
          COALESCE(ac.first_name || ' ' || ac.last_name, 'ไม่มีผู้เช่า') AS tenant,
          COALESCE(rt.monthly_rent, 0) AS room_rate,
          COALESCE(mr.water_prev, 0) AS water_prev,
          COALESCE(mr.water_curr, 0) AS water_curr,
          COALESCE(mr.electric_prev, 0) AS electric_prev,
          COALESCE(mr.electric_curr, 0) AS electric_curr,
          -- ใช้หน่วยที่ใช้ที่เก็บไว้ในฐานข้อมูลแล้ว
          COALESCE(mr.water_unit_used, 0) AS water_usage,
          COALESCE(mr.electric_unit_used, 0) AS electric_usage,
          COALESCE(mr.water_rate, 0) AS water_rate,
          COALESCE(mr.electricity_rate, 0) AS electricity_rate,
          -- คำนวณค่าน้ำและค่าไฟจากหน่วยที่เก็บไว้แล้ว
          (COALESCE(mr.water_unit_used, 0) * COALESCE(mr.water_rate, 0)) AS water_charge,
          (COALESCE(mr.electric_unit_used, 0) * COALESCE(mr.electricity_rate, 0)) AS electricity_charge,
          -- คำนวณยอดรวมจากหน่วยที่เก็บไว้แล้ว
          COALESCE(
            inv.total,
            COALESCE(rt.monthly_rent, 0) + 
            (COALESCE(mr.water_unit_used, 0) * COALESCE(mr.water_rate, 0)) + 
            (COALESCE(mr.electric_unit_used, 0) * COALESCE(mr.electricity_rate, 0))
          ) AS total_amount,
          CASE 
            WHEN inv.invoice_receipt_id IS NOT NULL THEN true
            ELSE false
          END AS has_invoice,
          COALESCE(ac.contract_status, 'no_contract') as contract_status,
          mr.created_at as reading_date
        FROM meter_readings mr
        JOIN rooms r ON mr.room_id = r.room_id
        LEFT JOIN room_types rt ON r.room_type_id = rt.room_type_id
        LEFT JOIN active_contracts_in_period ac ON ac.room_id = r.room_id
        LEFT JOIN (
          SELECT ii.room_id, ii.invoice_receipt_id, ii.total
          FROM invoice_receipts ii
          JOIN monthly_invoices mi ON ii.monthly_invoice_id = mi.monthly_invoice_id
          WHERE mi.meter_record_id = $1 AND ii.dorm_id = $2
        ) inv ON inv.room_id = r.room_id
        WHERE mr.meter_record_id = $1 AND r.dorm_id = $2
        ORDER BY r.floor_number, r.room_number;
      `,
      [meterRecordId, dormId]
    );

    res.json(result.rows);
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
  const client = await pool.connect();

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
    const ownershipCheck = await pool.query(
      "SELECT dorm_id FROM dormitories WHERE dorm_id = $1 AND user_id = $2",
      [dormId, user_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Access denied: ไม่สามารถเข้าถึงข้อมูลหอพักนี้ได้" });
    }

    const { meterRecordId, billMonth, dueDate, lateFeePerDay, rooms } =
      req.body;

    // แปลง YYYY-MM เป็น YYYY-MM-01
    const formatBillMonth = (billMonth) => {
      if (billMonth.includes("-01")) {
        return billMonth;
      }
      return `${billMonth}-01`;
    };

    const formattedBillMonth = formatBillMonth(billMonth);
    console.log("📅 Formatted bill month:", formattedBillMonth);

    await client.query("BEGIN");

    const monthlyInvoiceRes = await client.query(
      `INSERT INTO monthly_invoices (
        meter_record_id, dorm_id, issue_date, due_date, charge_per_day, month
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)
      RETURNING monthly_invoice_id`,
      [meterRecordId, dormId, dueDate, lateFeePerDay, formattedBillMonth]
    );
    const monthlyInvoiceId = monthlyInvoiceRes.rows[0].monthly_invoice_id;

    for (const room of rooms) {
      // ตรวจสอบข้อมูลห้อง
      if (!room.roomId || !room.tenantId) {
        console.error("❌ Missing roomId or tenantId for room:", room);
        throw new Error(
          `ข้อมูลห้องไม่ครบถ้วน: ห้อง ${room.roomId || "ไม่ระบุ"}`
        );
      }

      const invoiceNumber = generateInvoiceNumber();

      // คำนวณยอดรวม
      const roomRate = parseFloat(room.roomRate) || 0;
      const waterCharge =
        (parseInt(room.waterUsage) || 0) * (parseFloat(room.waterRate) || 0);
      const electricCharge =
        (parseInt(room.electricUsage) || 0) *
        (parseFloat(room.electricityRate) || 0);
      const totalAmount = roomRate + waterCharge + electricCharge;

      const invoiceRes = await client.query(
        `INSERT INTO invoice_receipts (
          monthly_invoice_id, dorm_id, utility_rate_id, room_id, tenant_id,
          total, status, created_at, invoice_number, bill_month, due_date
        ) VALUES (
          $1, $2,
          (SELECT utility_rate_id FROM utility_rates WHERE dorm_id = $2 ORDER BY start_date DESC LIMIT 1),
          $3, $4, $5, 'unpaid', NOW(), $6, $7, $8
        ) RETURNING invoice_receipt_id`,
        [
          monthlyInvoiceId,
          dormId,
          room.roomId,
          room.tenantId,
          totalAmount,
          invoiceNumber,
          formattedBillMonth,
          dueDate,
        ]
      );

      const invoiceId = invoiceRes.rows[0].invoice_receipt_id;

      // ✅ เพิ่มรายการบิลที่แยกออกจากกัน
      await client.query(
        `
        INSERT INTO invoice_receipt_items (
          invoice_receipt_id, item_type, description, unit_count, price
        )
        VALUES 
          ($1, 'rent', 'ค่าเช่าห้อง', 1, $2),
          ($1, 'water', $3, $4, $5),
          ($1, 'electric', $6, $7, $8)
      `,
        [
          invoiceId,
          parseFloat(room.roomRate) || 0,
          `ค่าน้ำ: ${parseInt(room.waterUsage) || 0} หน่วย`,
          parseInt(room.waterUsage) || 0,
          parseFloat(room.waterRate) || 0,
          `ค่าไฟ: ${parseInt(room.electricUsage) || 0} หน่วย`,
          parseInt(room.electricUsage) || 0,
          parseFloat(room.electricityRate) || 0,
        ]
      );

      // ✅ เพิ่มบริการรายเดือนจากสัญญา
      const contractServicesRes = await client.query(
        `
        SELECT service_name, service_price, quantity
        FROM monthly_service cs
        JOIN contracts c ON cs.contract_id = c.contract_id
        WHERE c.room_id = $1 AND c.status = 'active' AND cs.is_active = true
      `,
        [room.roomId]
      );

      for (const service of contractServicesRes.rows) {
        await client.query(
          `
          INSERT INTO invoice_receipt_items (
            invoice_receipt_id, item_type, description, unit_count, price
          ) VALUES ($1, 'service', $2, $3, $4)
        `,
          [
            invoiceId,
            service.service_name,
            service.quantity || 1,
            service.service_price,
          ]
        );
      }

      // ✅ คำนวณยอดรวมใหม่ (รวมบริการรายเดือน)
      const serviceTotal = contractServicesRes.rows.reduce(
        (sum, service) =>
          sum + parseFloat(service.service_price) * (service.quantity || 1),
        0
      );
      const finalTotal = totalAmount + serviceTotal;

      // อัปเดตยอดรวมใน invoice
      await client.query(
        "UPDATE invoice_receipts SET total = $1 WHERE invoice_receipt_id = $2",
        [finalTotal, invoiceId]
      );

      console.log("✅ Invoice created:", invoiceId);
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "สร้างใบแจ้งหนี้สำเร็จแล้ว" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ createInvoices error:", error);
    console.error("❌ Stack trace:", error.stack);
    res.status(500).json({
      error: "เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้",
      details: error.message,
    });
  } finally {
    client.release();
  }
};

// ดึงเดือนที่มีใบแจ้งหนี้
exports.getAvailableInvoiceMonths = async (req, res) => {
  const { dormId } = req.params;
  const user_id = req.user.user_id;

  try {
    // ตรวจสอบว่าหอพักเป็นของ user ที่ login
    const ownershipCheck = await pool.query(
      "SELECT dorm_id FROM dormitories WHERE dorm_id = $1 AND user_id = $2",
      [dormId, user_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Access denied: ไม่สามารถเข้าถึงข้อมูลหอพักนี้ได้" });
    }

    const result = await pool.query(
      `
        SELECT DISTINCT TO_CHAR(bill_month, 'YYYY-MM') as bill_month
        FROM invoice_receipts
        WHERE dorm_id = $1
        ORDER BY bill_month DESC
      `,
      [dormId]
    );

    res.json(result.rows);
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
    const ownershipCheck = await pool.query(
      "SELECT dorm_id FROM dormitories WHERE dorm_id = $1 AND user_id = $2",
      [dormId, user_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Access denied: ไม่สามารถเข้าถึงข้อมูลหอพักนี้ได้" });
    }
    let result;

    if (month) {
      // ถ้ามี month parameter ให้กรองตามเดือน - ใช้ query แบบง่าย
      const basicQuery = `
        SELECT 
          ir.invoice_receipt_id AS id,
          r.room_number,
          r.floor_number AS floor,
          COALESCE(t.first_name || ' ' || t.last_name, 'ไม่มีผู้เช่า') AS tenant,
          COALESCE(t.first_name || ' ' || t.last_name, 'ไม่มีผู้เช่า') AS tenant_name,
          t.address AS tenant_address,
          t.phone_number AS tenant_phone,
          t.email AS tenant_email,
          t.subdistrict AS tenant_subdistrict,
          t.district AS tenant_district,
          t.province AS tenant_province,
          ir.total AS amount,
          ir.status,
          ir.invoice_number,
          ir.due_date,
          d.name AS dorm_name,
          d.address AS dorm_address,
          d.phone AS dorm_phone,
          d.subdistrict AS dorm_subdistrict,
          d.district AS dorm_district,
          d.province AS dorm_province,
          TO_CHAR(ir.bill_month, 'YYYY-MM') AS bill_month
        FROM invoice_receipts ir
        JOIN rooms r ON ir.room_id = r.room_id
        LEFT JOIN tenants t ON ir.tenant_id = t.tenant_id
        JOIN dormitories d ON ir.dorm_id = d.dorm_id
        WHERE ir.dorm_id = $1 AND TO_CHAR(ir.bill_month, 'YYYY-MM') = $2
        ORDER BY r.floor_number, r.room_number;
      `;

      const basicResult = await pool.query(basicQuery, [dormId, month]);

      // Then get invoice items for each bill
      for (const bill of basicResult.rows) {
        const itemsResult = await pool.query(
          `
          SELECT 
            invoice_receipt_item_id as id,
            description,
            amount,
            unit_count,
            price,
            item_type
          FROM invoice_receipt_items 
          WHERE invoice_receipt_id = $1
        `,
          [bill.id]
        );

        bill.invoice_items = itemsResult.rows;
      }

      result = basicResult;
    } else {
      // ถ้าไม่มี month parameter ให้แสดงทั้งหมด - ใช้ GROUP BY เพื่อรวม items
      const sqlQuery = `
        SELECT 
          ii.invoice_receipt_id AS id,
          r.room_number,
          r.floor_number AS floor,
          COALESCE(t.first_name || ' ' || t.last_name, 'ไม่มีผู้เช่า') AS tenant,
          COALESCE(t.first_name || ' ' || t.last_name, 'ไม่มีผู้เช่า') AS tenant_name,
          t.address AS tenant_address,
          t.phone_number AS tenant_phone,
          t.email AS tenant_email,
          t.subdistrict AS tenant_subdistrict,
          t.district AS tenant_district,
          t.province AS tenant_province,
          ii.total AS amount,
          ii.status,
          ii.invoice_number,
          ii.due_date,
          d.name AS dorm_name,
          d.address AS dorm_address,
          d.phone AS dorm_phone,
          d.subdistrict AS dorm_subdistrict,
          d.district AS dorm_district,
          d.province AS dorm_province,
          TO_CHAR(ii.bill_month, 'YYYY-MM') AS bill_month,
          -- รวม invoice items เป็น JSON array
          JSON_AGG(
            CASE 
              WHEN item.invoice_receipt_item_id IS NOT NULL THEN
                JSON_BUILD_OBJECT(
                  'id', item.invoice_receipt_item_id,
                  'description', item.description,
                  'amount', item.amount,
                  'unit_count', item.unit_count,
                  'price', item.price,
                  'item_type', item.item_type
                )
              ELSE NULL
            END
          ) FILTER (WHERE item.invoice_receipt_item_id IS NOT NULL) AS invoice_items
        FROM invoice_receipts ii
        JOIN rooms r ON ii.room_id = r.room_id
        LEFT JOIN tenants t ON ii.tenant_id = t.tenant_id
        JOIN dormitories d ON ii.dorm_id = d.dorm_id
        LEFT JOIN invoice_receipt_items item ON ii.invoice_receipt_id = item.invoice_receipt_id
        WHERE ii.dorm_id = $1
        GROUP BY ii.invoice_receipt_id, r.room_number, r.floor_number, t.first_name, t.last_name, 
                 t.address, t.phone_number, t.email, t.subdistrict, t.district, t.province,
                 ii.total, ii.status, ii.invoice_number, ii.due_date,
                 d.name, d.address, d.phone, d.subdistrict, d.district, d.province,
                 ii.bill_month
        ORDER BY ii.bill_month DESC, r.floor_number, r.room_number;
      `;

      result = await pool.query(sqlQuery, [dormId]);
    }

    console.log("🏠 Query result length:", result.rows.length);
    if (result.rows.length > 0) {
      console.log("🏠 First row sample:", {
        id: result.rows[0].id,
        room_number: result.rows[0].room_number,
        tenant: result.rows[0].tenant,
      });

      // Debug ห้อง 104
      const room104 = result.rows.find((row) => row.room_number === "104");
      if (room104) {
        console.log("🏠 Room 104 details:", {
          id: room104.id,
          room_number: room104.room_number,
          tenant: room104.tenant,
          tenant_name: room104.tenant_name,
        });
      } else {
        console.log("🏠 Room 104 not found in results");
      }
    }

    res.json(result.rows);
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
    const invoiceQuery = `
    SELECT 
      i.invoice_receipt_id,
      i.monthly_invoice_id,
      i.invoice_number,
      i.room_id,
      r.room_number,
      r.floor_number,
      COALESCE(t.first_name || ' ' || t.last_name, 'ไม่มีผู้เช่า') AS tenant_name,
      t.address AS tenant_address,
      t.phone_number AS tenant_phone,
      t.province AS tenant_province,
      t.district AS tenant_district,
      t.subdistrict AS tenant_subdistrict,
      i.status,
      i.created_at,
      i.total,
      i.due_date,
      d.name AS dorm_name,
      d.address AS dorm_address,
      d.phone AS dorm_phone,
      d.subdistrict,
      d.district,
      d.province,
      mr.meter_record_date,
      mi.charge_per_day,
      TO_CHAR(mr.meter_record_date, 'YYYY-MM') AS bill_month
    FROM invoice_receipts i
    JOIN monthly_invoices mi ON i.monthly_invoice_id = mi.monthly_invoice_id
    JOIN rooms r ON i.room_id = r.room_id
    JOIN dormitories d ON i.dorm_id = d.dorm_id
    LEFT JOIN tenants t ON i.tenant_id = t.tenant_id
    LEFT JOIN meter_records mr ON mi.meter_record_id = mr.meter_record_id
    WHERE i.invoice_receipt_id = $1 AND i.dorm_id = $2;
    `;

    const invoiceResult = await pool.query(invoiceQuery, [invoiceId, dormId]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบใบแจ้งหนี้ที่ระบุ" });
    }

    const invoice = invoiceResult.rows[0];

    // อัปเดตค่าปรับล่าช้าอัตโนมัติ
    const lateData = await exports.updateLateFee(invoiceId);

    // ดึงข้อมูลรายการค่าใช้จ่าย (invoice_items) หลังจากอัปเดตค่าปรับ
    const itemsQuery = `
      SELECT 
        invoice_receipt_item_id,
        description,
        item_type as type,
        price as rate,
        amount,
        unit_count
      FROM invoice_receipt_items
      WHERE invoice_receipt_id = $1
      ORDER BY 
        CASE item_type
          WHEN 'rent' THEN 1
          WHEN 'water' THEN 2
          WHEN 'electric' THEN 3
          WHEN 'service' THEN 4
          WHEN 'discount' THEN 5
          WHEN 'late_fee' THEN 6
          ELSE 7
        END,
        invoice_receipt_item_id
    `;

    const itemsResult = await pool.query(itemsQuery, [invoiceId]);

    // คำนวณ total จากรายการจริง แทนการใช้ค่าจากฐานข้อมูล
    const calculatedTotal = itemsResult.rows.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      // ตรวจสอบว่าเป็น discount หรือไม่
      if (item.type === "discount") {
        // สำหรับ discount ให้ลบออกจาก total (ถ้า amount เป็น positive ให้แปลงเป็น negative)
        return sum - Math.abs(amount);
      }
      return sum + amount;
    }, 0);
    // ดึงข้อมูลการชำระเงินทั้งหมด
    const paymentsQuery = `
      SELECT 
        COALESCE(SUM(payment_amount), 0) as total_paid,
        COUNT(*) as payment_count
      FROM payments 
      WHERE invoice_receipt_id = $1
    `;

    const paymentsResult = await pool.query(paymentsQuery, [invoiceId]);
    const paymentData = paymentsResult.rows[0];
    const totalPaid = parseFloat(paymentData.total_paid);

    // ใช้ยอดรวมที่คำนวณใหม่แทนยอดจากฐานข้อมูล
    const finalTotal = calculatedTotal;
    const balance = finalTotal - totalPaid;
    // จัดรูปแบบผลลัพธ์
    const response = {
      invoice: {
        invoice_receipt_id: invoice.invoice_receipt_id,
        monthly_invoice_id: invoice.monthly_invoice_id,
        invoice_number: invoice.invoice_number,
        room_id: invoice.room_id,
        room_number: invoice.room_number,
        floor_number: invoice.floor_number,
        tenant_name: invoice.tenant_name,
        tenant_address: invoice.tenant_address,
        tenant_phone: invoice.tenant_phone,
        tenant_province: invoice.tenant_province,
        tenant_district: invoice.tenant_district,
        tenant_subdistrict: invoice.tenant_subdistrict,
        status: balance <= 0 ? "paid" : "unpaid", // อัปเดต status ตามยอดคงเหลือ
        created_at: invoice.created_at,
        total: finalTotal, // ใช้ยอดรวมที่คำนวณใหม่
        total_paid: totalPaid,
        balance: balance,
        dorm_name: invoice.dorm_name,
        dorm_address: invoice.dorm_address,
        dorm_subdistrict: invoice.subdistrict,
        dorm_district: invoice.district,
        dorm_province: invoice.province,
        dorm_phone: invoice.dorm_phone,
        meter_record_date: invoice.meter_record_date,
        bill_month: invoice.bill_month,
        due_date: invoice.due_date,
        charge_per_day: invoice.charge_per_day,
        late_fee: lateData.lateFee,
        late_days: lateData.lateDays,
      },
      invoice_items: itemsResult.rows,
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
    const invoiceCheck = await pool.query(
      "SELECT invoice_receipt_id FROM invoice_receipts WHERE invoice_receipt_id = $1 AND dorm_id = $2",
      [invoiceId, dormId]
    );

    if (invoiceCheck.rows.length === 0) {
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
    const result = await pool.query(
      `INSERT INTO invoice_receipt_items (
            invoice_receipt_id, item_type, description, price, unit_count
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *`,
      [invoiceId, type, description, finalPrice, unitCount]
    );

    // อัพเดท total ในตาราง invoices
    await updateInvoiceTotal(invoiceId);

    res.status(201).json({
      message: "เพิ่มรายการเรียบร้อย",
      item: {
        ...result.rows[0],
        invoice_item_id: result.rows[0].invoice_receipt_item_id,
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
    const itemCheck = await pool.query(
      `SELECT ii.*, i.dorm_id 
           FROM invoice_receipt_items ii 
           JOIN invoice_receipts i ON ii.invoice_receipt_id = i.invoice_receipt_id 
           WHERE ii.invoice_receipt_item_id = $1 AND i.invoice_receipt_id = $2 AND i.dorm_id = $3`,
      [itemId, invoiceId, dormId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบรายการที่ระบุ" });
    }

    const item = itemCheck.rows[0];

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
    const result = await pool.query(
      `UPDATE invoice_receipt_items 
           SET description = $1, price = $2, unit_count = $3
           WHERE invoice_receipt_item_id = $4
           RETURNING *`,
      [
        description || item.description,
        parseFloat(rate) || item.price,
        unit_count || item.unit_count,
        itemId,
      ]
    );

    // อัพเดท total ในตาราง invoices
    await updateInvoiceTotal(invoiceId);

    res.json({
      message: "แก้ไขรายการเรียบร้อย",
      item: result.rows[0],
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
    const itemCheck = await pool.query(
      `SELECT ii.*, i.dorm_id 
           FROM invoice_receipt_items ii 
           JOIN invoice_receipts i ON ii.invoice_receipt_id = i.invoice_receipt_id 
           WHERE ii.invoice_receipt_item_id = $1 AND i.invoice_receipt_id = $2 AND i.dorm_id = $3`,
      [itemId, invoiceId, dormId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบรายการที่ระบุ" });
    }

    const item = itemCheck.rows[0];

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
    await pool.query(
      "DELETE FROM invoice_receipt_items WHERE invoice_receipt_item_id = $1",
      [itemId]
    );

    // อัพเดท total ในตาราง invoices
    await updateInvoiceTotal(invoiceId);

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
    const itemsResult = await pool.query(
      `SELECT item_type, amount 
           FROM invoice_receipt_items 
           WHERE invoice_receipt_id = $1`,
      [invoiceId]
    );

    const calculatedTotal = itemsResult.rows.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      // ตรวจสอบว่าเป็น discount หรือไม่
      if (item.item_type === "discount") {
        // สำหรับ discount ให้ลบออกจาก total (ถ้า amount เป็น positive ให้แปลงเป็น negative)
        return sum - Math.abs(amount);
      }
      return sum + amount;
    }, 0);

    console.log(`🔄 อัพเดท total ของ invoice ${invoiceId}: ${calculatedTotal}`);

    // อัพเดท total ในตาราง invoice_receipts
    const result = await pool.query(
      `UPDATE invoice_receipts 
           SET total = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE invoice_receipt_id = $2
           RETURNING total`,
      [calculatedTotal, invoiceId]
    );

    return result.rows[0]?.total || 0;
  } catch (error) {
    console.error("❌ อัพเดท total ใน invoices ล้มเหลว:", error);
    throw error;
  }
};

// ฟังก์ชันคำนวณและอัปเดตค่าปรับล่าช้าอัตโนมัติ
exports.updateLateFee = async (invoiceId) => {
  try {
    // ดึงข้อมูลใบแจ้งหนี้
    const invoiceQuery = `
      SELECT i.due_date, i.status, mi.charge_per_day
      FROM invoice_receipts i
      JOIN monthly_invoices mi ON i.monthly_invoice_id = mi.monthly_invoice_id
      WHERE i.invoice_receipt_id = $1
    `;
    const invoiceResult = await pool.query(invoiceQuery, [invoiceId]);

    if (invoiceResult.rows.length === 0) {
      return { lateFee: 0, lateDays: 0 };
    }

    const invoice = invoiceResult.rows[0];
    const currentDate = new Date();
    const dueDate = new Date(invoice.due_date);

    // คำนวณค่าปรับล่าช้า
    let lateFee = 0;
    let lateDays = 0;

    if (invoice.status === "unpaid" && currentDate > dueDate) {
      lateDays = Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24));
      lateFee = lateDays * (parseFloat(invoice.charge_per_day) || 0);

      // ตรวจสอบว่ามีค่าปรับล่าช้าอยู่แล้วหรือไม่
      const existingLateFeeQuery = `
        SELECT invoice_receipt_item_id FROM invoice_receipt_items 
        WHERE invoice_receipt_id = $1 AND item_type = 'late_fee'
      `;
      const existingLateFee = await pool.query(existingLateFeeQuery, [
        invoiceId,
      ]);

      if (existingLateFee.rows.length === 0 && lateFee > 0) {
        // เพิ่มค่าปรับใหม่
        await pool.query(
          `INSERT INTO invoice_receipt_items (
            invoice_receipt_id, item_type, description, price, unit_count
          ) VALUES ($1, 'late_fee', $2, $3, $4)`,
          [invoiceId, `ค่าปรับล่าช้า (${lateDays} วัน)`, lateFee, lateDays]
        );
      } else if (existingLateFee.rows.length > 0) {
        // อัปเดตค่าปรับที่มีอยู่
        await pool.query(
          `UPDATE invoice_receipt_items 
           SET description = $1, price = $2, unit_count = $3
           WHERE invoice_receipt_id = $4 AND item_type = 'late_fee'`,
          [`ค่าปรับล่าช้า (${lateDays} วัน)`, lateFee, lateDays, invoiceId]
        );
      }

      // อัปเดต total
      await updateInvoiceTotal(invoiceId);
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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ตรวจสอบว่าใบแจ้งหนี้มีอยู่จริง
    const invoiceExistCheck = await client.query(
      "SELECT invoice_receipt_id, total, dorm_id FROM invoice_receipts WHERE invoice_receipt_id = $1",
      [invoiceId]
    );

    console.log("🔍 Invoice Exist Check:", {
      invoiceId,
      found: invoiceExistCheck.rows.length,
      data: invoiceExistCheck.rows[0],
    });

    if (invoiceExistCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "ไม่พบใบแจ้งหนี้ที่ระบุ" });
    }

    // ตรวจสอบว่าเป็นของหอพักที่ถูกต้อง
    const invoice = invoiceExistCheck.rows[0];
    if (invoice.dorm_id !== parseInt(dormId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงใบแจ้งหนี้นี้" });
    }

    // คำนวณยอดที่ชำระแล้ว
    const paymentSumResult = await client.query(
      "SELECT COALESCE(SUM(payment_amount), 0) as total_paid FROM payments WHERE invoice_receipt_id = $1",
      [invoiceId]
    );

    const totalPaid = parseFloat(paymentSumResult.rows[0].total_paid) || 0;
    const remainingAmount = parseFloat(invoice.total) - totalPaid;

    console.log(`💰 Payment Debug:`, {
      invoiceId,
      total: invoice.total,
      totalPaid,
      remainingAmount,
    });

    if (remainingAmount <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "ใบแจ้งหนี้นี้ชำระครบแล้ว" });
    }

    // สร้างเลขที่ใบเสร็จ
    const receiptNumber = exports.generateReceiptNumber();

    // บันทึกการชำระเงิน (ชำระเต็มจำนวนที่เหลือ)
    const paymentResult = await client.query(
      `INSERT INTO payments (invoice_receipt_id, payment_method, payment_amount, payment_date, payment_note, receipt_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        invoiceId,
        payment_method,
        remainingAmount,
        payment_date,
        payment_note,
        receiptNumber,
      ]
    );

    // อัปเดต status ของใบแจ้งหนี้เป็น 'paid'
    await client.query(
      "UPDATE invoice_receipts SET status = $1, paid_date = $2 WHERE invoice_receipt_id = $3",
      ["paid", payment_date, invoiceId]
    );

    await client.query("COMMIT");

    res.json({
      message: "บันทึกการชำระเงินสำเร็จ",
      payment: paymentResult.rows[0],
      remainingAmount: 0,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ บันทึกการชำระเงินล้มเหลว:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกการชำระเงิน" });
  } finally {
    client.release();
  }
};

// ฟังก์ชันดึงประวัติการชำระเงิน
exports.getPaymentHistory = async (req, res) => {
  const { dormId, invoiceId } = req.params;

  try {

    const result = await pool.query(
      `SELECT p.*, i.invoice_number 
       FROM payments p
       JOIN invoice_receipts i ON p.invoice_receipt_id = i.invoice_receipt_id
       WHERE p.invoice_receipt_id = $1 AND i.dorm_id = $2
       ORDER BY p.payment_date DESC, p.created_at DESC`,
      [invoiceId, dormId]
    );

    res.json(
      result.rows.map((payment) => ({
        id: payment.payment_id,
        billNumber: payment.invoice_number,
        amount: parseFloat(payment.payment_amount),
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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ตรวจสอบว่าการชำระเงินมีอยู่และเป็นของใบแจ้งหนี้ที่ถูกต้อง
    const paymentResult = await client.query(
      `SELECT p.* FROM payments p
       JOIN invoice_receipts i ON p.invoice_receipt_id = i.invoice_receipt_id
       WHERE p.payment_id = $1 AND p.invoice_receipt_id = $2 AND i.dorm_id = $3`,
      [paymentId, invoiceId, dormId]
    );

    if (paymentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "ไม่พบการชำระเงินที่ระบุ" });
    }

    // ลบการชำระเงิน
    await client.query("DELETE FROM payments WHERE payment_id = $1", [
      paymentId,
    ]);

    // ตรวจสอบว่ายังมีการชำระเงินอื่นหรือไม่
    const remainingPayments = await client.query(
      "SELECT COUNT(*) as count FROM payments WHERE invoice_receipt_id = $1",
      [invoiceId]
    );

    // ถ้าไม่มีการชำระเงินเหลืออยู่ ให้เปลี่ยน status กลับเป็น unpaid
    if (parseInt(remainingPayments.rows[0].count) === 0) {
      await client.query(
        "UPDATE invoice_receipts SET status = $1, paid_date = NULL WHERE invoice_receipt_id = $2",
        ["unpaid", invoiceId]
      );
    }

    await client.query("COMMIT");

    res.json({ message: "ลบการชำระเงินสำเร็จ" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ ลบการชำระเงินล้มเหลว:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบการชำระเงิน" });
  } finally {
    client.release();
  }
};

// ฟังก์ชันดึงใบเสร็จรับเงินทั้งหมดของหอพัก (รวมทั้ง payment receipts และ move-in receipts)
exports.getPaymentReceiptsByDorm = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { month, year } = req.query;

    // Query สำหรับ payment receipts (ใบเสร็จการชำระบิลรายเดือน)
    let paymentQuery = `
      SELECT DISTINCT
        p.payment_id as id,
        p.receipt_number as receiptNo,
        p.payment_date as date,
        p.payment_amount as amount,
        p.payment_method as channel,
        p.payment_note as note,
        i.invoice_number as invoiceNumber,
        r.room_number as room,
        COALESCE(
          NULLIF(TRIM(CONCAT(t_invoice.first_name, ' ', t_invoice.last_name)), ''),
          NULLIF(TRIM(CONCAT(t_active.first_name, ' ', t_active.last_name)), ''),
          NULLIF(TRIM(CONCAT(t_latest.first_name, ' ', t_latest.last_name)), ''),
          'ไม่ระบุชื่อ'
        ) as payer,
        CASE 
          WHEN p.payment_amount > 0 THEN 'ใบเงินสด'
          ELSE 'ยกเลิก'
        END as status,
        i.invoice_receipt_id as invoiceId,
        'payment' as receipt_type,
        p.created_at as created_at
      FROM payments p
      JOIN invoice_receipts i ON p.invoice_receipt_id = i.invoice_receipt_id
      JOIN rooms r ON i.room_id = r.room_id
      -- ผู้เช่าที่เป็นเจ้าของใบแจ้งหนี้ (ลำดับความสำคัญสูงสุด)
      LEFT JOIN tenants t_invoice ON i.tenant_id = t_invoice.tenant_id
      -- ผู้เช่าปัจจุบัน (fallback)
      LEFT JOIN contracts c_active ON r.room_id = c_active.room_id AND c_active.status = 'active'
      LEFT JOIN tenants t_active ON c_active.tenant_id = t_active.tenant_id
      -- ผู้เช่าล่าสุด (fallback สุดท้าย)
      LEFT JOIN LATERAL (
        SELECT t.first_name, t.last_name
        FROM contracts c
        JOIN tenants t ON c.tenant_id = t.tenant_id
        WHERE c.room_id = r.room_id
        ORDER BY c.created_at DESC
        LIMIT 1
      ) t_latest ON true
      WHERE r.dorm_id = $1
    `;

    // Query สำหรับ move-in receipts (ใบเสร็จค่าเข้าพัก)
    let moveInQuery = `
      SELECT 
        mir.move_in_receipt_id as id,
        mir.receipt_number as receiptNo,
        mir.receipt_date as date,
        mir.total_amount as amount,
        mir.payment_method as channel,
        mir.receipt_note as note,
        'Move-In' as invoiceNumber,
        rm.room_number as room,
        CONCAT(t.first_name, ' ', t.last_name) as payer,
        CASE 
          WHEN mir.total_amount > 0 THEN 'ใบเงินสด'
          ELSE 'ยกเลิก'
        END as status,
        mir.contract_id as invoiceId,
        'move_in' as receipt_type,
        mir.created_at as created_at
      FROM move_in_receipts mir
      JOIN contracts c ON mir.contract_id = c.contract_id
      JOIN tenants t ON c.tenant_id = t.tenant_id
      JOIN rooms rm ON c.room_id = rm.room_id
      WHERE rm.dorm_id = $1
    `;

    const queryParams = [dormId];

    // เพิ่มเงื่อนไขกรองตามเดือน/ปี ถ้ามี
    if (month && year) {
      paymentQuery += ` AND EXTRACT(MONTH FROM p.payment_date) = $2 AND EXTRACT(YEAR FROM p.payment_date) = $3`;
      moveInQuery += ` AND EXTRACT(MONTH FROM mir.receipt_date) = $2 AND EXTRACT(YEAR FROM mir.receipt_date) = $3`;
      queryParams.push(month, year);
    } else if (year) {
      paymentQuery += ` AND EXTRACT(YEAR FROM p.payment_date) = $2`;
      moveInQuery += ` AND EXTRACT(YEAR FROM mir.receipt_date) = $2`;
      queryParams.push(year);
    }

    // รวม query ทั้งสองแบบด้วย UNION ALL และเรียงลำดับตาม created_at (ล่าสุดไปเก่าสุด)
    const combinedQuery = `
      ${paymentQuery}
      UNION ALL
      ${moveInQuery}
      ORDER BY created_at DESC, id DESC
    `;

    const result = await pool.query(combinedQuery, queryParams);

    // จัดรูปแบบข้อมูลให้ตรงกับ frontend
    const receipts = result.rows.map((row) => ({
      id: `${row.receipt_type}_${row.id}`, // เพิ่ม prefix เพื่อแยกประเภท
      receiptNo: row.receiptno || row.receiptNo || "", // รองรับทั้ง lowercase และ camelCase
      paymentDate: new Date(row.date).toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      room: row.room || "",
      channel: getPaymentChannelText(row.channel),
      amount: parseFloat(row.amount),
      totalAmount: parseFloat(row.amount), // เพิ่ม field นี้
      paidAmount: parseFloat(row.amount), // เพิ่ม field นี้
      status: row.status,
      payer: row.payer,
      note: row.note || "",
      invoiceNumber: row.invoicenumber,
      invoiceId: row.invoiceid,
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

  const client = await pool.connect();
  try {
    // ตรวจสอบว่าหอพักเป็นของ user ที่ login
    const ownershipCheck = await client.query(
      "SELECT dorm_id FROM dormitories WHERE dorm_id = $1 AND user_id = $2",
      [dormId, user_id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Access denied: ไม่สามารถเข้าถึงข้อมูลหอพักนี้ได้" });
    }

    await client.query("BEGIN");

    // ค้นหาบิลค้างชำระในรอบที่ระบุ
    const unpaidBillsResult = await client.query(
      `SELECT i.invoice_receipt_id, i.invoice_number, r.room_number
       FROM invoice_receipts i
       JOIN rooms r ON i.room_id = r.room_id
       WHERE i.dorm_id = $1 
       AND DATE_TRUNC('month', i.bill_month) = DATE_TRUNC('month', $2::date)
       AND i.status = 'unpaid'`,
      [dormId, month + "-01"]
    );

    if (unpaidBillsResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "ไม่พบบิลค้างชำระในรอบที่ระบุ" });
    }

    const invoiceIds = unpaidBillsResult.rows.map(
      (row) => row.invoice_receipt_id
    );

    // ลบ invoice_items ที่เกี่ยวข้องก่อน (เนื่องจาก foreign key constraint)
    await client.query(
      `DELETE FROM invoice_receipt_items 
       WHERE invoice_receipt_id = ANY($1::int[])`,
      [invoiceIds]
    );

    // ลบ invoices
    const deleteResult = await client.query(
      `DELETE FROM invoice_receipts 
       WHERE invoice_receipt_id = ANY($1::int[])
       RETURNING invoice_receipt_id, invoice_number`,
      [invoiceIds]
    );

    await client.query("COMMIT");

    res.json({
      message: `ลบบิลค้างชำระสำเร็จ จำนวน ${deleteResult.rows.length} ใบ`,
      deletedCount: deleteResult.rows.length,
      deletedBills: unpaidBillsResult.rows.map((row) => ({
        invoiceNumber: row.invoice_number,
        roomNumber: row.room_number,
      })),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ ลบบิลค้างชำระล้มเหลว:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบบิลค้างชำระ" });
  } finally {
    client.release();
  }
};

// ดึงบิลค้างชำระทั้งหมดของหอพัก
exports.getPendingInvoicesByDorm = async (req, res) => {
  const client = await pool.connect();
  try {
    const { dormId } = req.params;

    const query = `
      SELECT DISTINCT
        i.invoice_receipt_id,
        i.invoice_number,
        i.bill_month as month,
        i.total as total_amount,
        i.due_date,
        i.status,
        i.created_at,
        COALESCE(r.room_number, 'ห้อง-' || i.room_id) as room_number,
        i.room_id,
        i.tenant_id,
        COALESCE(t.first_name || ' ' || t.last_name, 'ไม่มีผู้เช่า') as tenant_name,
        CASE 
          WHEN i.due_date < CURRENT_DATE THEN CURRENT_DATE - i.due_date
          ELSE 0
        END as days_overdue,
        CASE 
          WHEN i.due_date < CURRENT_DATE THEN 'overdue'
          ELSE 'pending'
        END as bill_status
      FROM invoice_receipts i
      LEFT JOIN rooms r ON i.room_id = r.room_id
      LEFT JOIN tenants t ON i.tenant_id = t.tenant_id
      WHERE i.dorm_id = $1 
        AND i.status = 'unpaid'
      ORDER BY 
        CASE 
          WHEN i.due_date < CURRENT_DATE THEN CURRENT_DATE - i.due_date
          ELSE 0
        END DESC,
        i.due_date ASC
    `;

    const result = await client.query(query, [dormId]);
    console.log(
      "📊 Raw pending bills result:",
      result.rows.length,
      "bills found"
    );
    console.log("📋 Bills data:", result.rows);

    // คำนวณสถิติ
    const bills = result.rows;
    const totalStats = {
      total: bills.length,
      pending: bills.filter((bill) => bill.bill_status === "pending").length,
      overdue: bills.filter((bill) => bill.bill_status === "overdue").length,
      totalAmount: bills.reduce(
        (sum, bill) => sum + parseFloat(bill.total_amount),
        0
      ),
      overdueAmount: bills
        .filter((bill) => bill.bill_status === "overdue")
        .reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0),
    };

    console.log("📈 Pending bills stats:", totalStats);

    res.json({
      success: true,
      data: {
        bills: bills,
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
  } finally {
    client.release();
  }
};

// ดึงบิลทั้งหมดของหอพัก
exports.getAllInvoicesByDorm = async (req, res) => {
  const client = await pool.connect();
  try {
    const { dormId } = req.params;

    const query = `
      SELECT 
        i.invoice_receipt_id,
        i.invoice_number,
        COALESCE(mi.issue_date, i.created_at) as issue_date,
        COALESCE(mi.month, i.bill_month) as month,
        i.total as total_amount,
        i.due_date,
        i.status,
        i.created_at,
        i.paid_date,
        r.room_number,
        COALESCE(t.first_name || ' ' || t.last_name, 'ไม่มีผู้เช่า') as tenant_name,
        t.tenant_id,
        CASE 
          WHEN i.due_date < CURRENT_DATE AND i.status = 'unpaid' THEN CURRENT_DATE - i.due_date
          ELSE 0
        END as days_overdue,
        CASE 
          WHEN i.status = 'paid' THEN 'paid'
          WHEN i.due_date < CURRENT_DATE AND i.status = 'unpaid' THEN 'overdue'
          WHEN i.status = 'unpaid' THEN 'pending'
          ELSE i.status
        END as bill_status
      FROM invoice_receipts i
      JOIN rooms r ON i.room_id = r.room_id
      LEFT JOIN tenants t ON i.tenant_id = t.tenant_id
      LEFT JOIN monthly_invoices mi ON i.monthly_invoice_id = mi.monthly_invoice_id
      WHERE i.dorm_id = $1 
      ORDER BY i.created_at DESC
    `;

    const result = await client.query(query, [dormId]);

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
  } finally {
    client.release();
  }
};

// ฟังก์ชันลบใบแจ้งหนี้เดี่ยว
exports.deleteSingleInvoice = async (req, res) => {
  const { dormId, invoiceId } = req.params;

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // ตรวจสอบว่าใบแจ้งหนี้มีอยู่จริงและเป็นของหอพักที่ระบุ
      const invoiceCheckQuery = `
        SELECT ir.invoice_receipt_id, ir.status, r.room_number
        FROM invoice_receipts ir
        JOIN rooms r ON ir.room_id = r.room_id
        WHERE ir.invoice_receipt_id = $1 AND ir.dorm_id = $2
      `;

      const invoiceCheckResult = await client.query(invoiceCheckQuery, [
        invoiceId,
        dormId,
      ]);

      if (invoiceCheckResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "ไม่พบใบแจ้งหนี้ที่ระบุ" });
      }

      const invoice = invoiceCheckResult.rows[0];

      // ตรวจสอบว่ามีการชำระเงินแล้วหรือไม่
      const paymentCheckQuery = `
        SELECT COUNT(*) as payment_count
        FROM payments
        WHERE invoice_receipt_id = $1
      `;

      const paymentCheckResult = await client.query(paymentCheckQuery, [
        invoiceId,
      ]);
      const paymentCount = parseInt(paymentCheckResult.rows[0].payment_count);

      if (paymentCount > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "ไม่สามารถลบใบแจ้งหนี้ที่มีการชำระเงินแล้วได้",
        });
      }

      // ลบข้อมูลการชำระเงิน (ถ้ามี)
      await client.query("DELETE FROM payments WHERE invoice_receipt_id = $1", [
        invoiceId,
      ]);

      // ลบรายการในใบแจ้งหนี้
      await client.query(
        "DELETE FROM invoice_receipt_items WHERE invoice_receipt_id = $1",
        [invoiceId]
      );

      // ลบใบแจ้งหนี้
      await client.query(
        "DELETE FROM invoice_receipts WHERE invoice_receipt_id = $1",
        [invoiceId]
      );

      await client.query("COMMIT");

      res.json({
        message: `ลบใบแจ้งหนี้ห้อง ${invoice.room_number} สำเร็จ`,
        deletedInvoiceId: invoiceId,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("🔥 Error in deleteSingleInvoice:", error);
    res
      .status(500)
      .json({ error: "เกิดข้อผิดพลาดในการลบใบแจ้งหนี้: " + error.message });
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
    const invoicesQuery = `
      SELECT 
        i.invoice_receipt_id,
        i.invoice_number,
        i.total as amount,
        i.due_date,
        i.created_at,
        r.room_number,
        COALESCE(t.first_name || ' ' || t.last_name, 'ไม่มีผู้เช่า') AS tenant_name,
        t.email AS tenant_email,
        t.phone_number AS tenant_phone,
        t.address AS tenant_address,
        t.subdistrict AS tenant_subdistrict,
        t.district AS tenant_district,
        t.province AS tenant_province,
        d.name AS dorm_name,
        d.email AS dorm_email,
        d.address AS dorm_address,
        d.phone AS dorm_phone,
        d.subdistrict AS dorm_subdistrict,
        d.district AS dorm_district,
        d.province AS dorm_province
      FROM invoice_receipts i
      JOIN rooms r ON i.room_id = r.room_id
      LEFT JOIN tenants t ON i.tenant_id = t.tenant_id
      JOIN dormitories d ON i.dorm_id = d.dorm_id
      WHERE i.invoice_receipt_id = ANY($1::int[])
        AND i.dorm_id = $2
        AND i.status = 'unpaid'
    `;

    const invoicesResult = await pool.query(invoicesQuery, [bills, dormId]);

    if (invoicesResult.rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบบิลค้างชำระที่ระบุ" });
    }

    // ดึงรายการค่าใช้จ่ายของแต่ละบิล
    const invoicesWithItems = await Promise.all(
      invoicesResult.rows.map(async (invoice) => {
        const itemsQuery = `
          SELECT 
            description,
            item_type as type,
            price,
            unit_count,
            amount
          FROM invoice_receipt_items
          WHERE invoice_receipt_id = $1
          ORDER BY 
            CASE item_type
              WHEN 'rent' THEN 1
              WHEN 'water' THEN 2
              WHEN 'electric' THEN 3
              WHEN 'service' THEN 4
              WHEN 'discount' THEN 5
              WHEN 'late_fee' THEN 6
              ELSE 7
            END
        `;

        const itemsResult = await pool.query(itemsQuery, [
          invoice.invoice_receipt_id,
        ]);

        return {
          ...invoice,
          dorm_id: dormId, // เพิ่ม dorm_id
          invoice_items: itemsResult.rows,
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
    let query = `
      SELECT 
        bsh.bill_send_history_id,
        bsh.bill_id,
        bsh.send_method,
        bsh.send_to,
        bsh.send_status,
        bsh.send_date,
        bsh.error_message,
        i.invoice_receipt_id,
        i.invoice_number,
        r.room_number,
        COALESCE(t.first_name || ' ' || t.last_name, 'ไม่มีผู้เช่า') as tenant_name
      FROM bill_send_history bsh
      LEFT JOIN invoice_receipts i ON bsh.bill_id = i.invoice_receipt_id
      LEFT JOIN rooms r ON i.room_id = r.room_id  
      LEFT JOIN tenants t ON i.tenant_id = t.tenant_id
      WHERE r.dorm_id = $1
    `;

    const params = [dormId];

    if (month) {
      query += ` AND TO_CHAR(i.bill_month, 'YYYY-MM') = $2`;
      params.push(month);
    }

    query += ` ORDER BY bsh.send_date DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
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
    const contractResult = await pool.query(
      `
      SELECT room_id, tenant_id 
      FROM contracts 
      WHERE contract_id = $1
    `,
      [contractId]
    );

    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบสัญญาที่ระบุ" });
    }

    const { room_id, tenant_id } = contractResult.rows[0];

    // Get unpaid bills for this contract
    const result = await pool.query(
      `
      SELECT 
        ir.invoice_receipt_id,
        ir.invoice_number,
        ir.bill_month,
        ir.due_date,
        ir.total as total_amount,
        ir.status,
        r.room_number,
        d.name as dorm_name,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'item_id', iri.invoice_receipt_item_id,
            'item_name', iri.description,
            'item_amount', iri.amount,
            'item_type', iri.item_type
          )
        ) as items
      FROM invoice_receipts ir
      JOIN rooms r ON ir.room_id = r.room_id
      JOIN dormitories d ON r.dorm_id = d.dorm_id
      LEFT JOIN invoice_receipt_items iri ON ir.invoice_receipt_id = iri.invoice_receipt_id
      WHERE ir.room_id = $1 
        AND ir.tenant_id = $2
        AND ir.status = 'unpaid'
      GROUP BY 
        ir.invoice_receipt_id, 
        ir.invoice_number, 
        ir.bill_month, 
        ir.due_date, 
        ir.total, 
        ir.status,
        r.room_number,
        d.name
      ORDER BY ir.due_date DESC
    `,
      [room_id, tenant_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching bills by contract:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงบิลค้างชำระ" });
  }
};
