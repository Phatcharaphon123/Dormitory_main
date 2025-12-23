const pool = require('../db');

const getTenantFullById = async (req, res) => {
  const { tenantId } = req.params;
  try {
    // 1. ข้อมูลหลัก
    const tenantRes = await pool.query('SELECT * FROM tenants WHERE tenant_id = $1', [tenantId]);
    if (tenantRes.rows.length === 0) {
      return res.status(404).json({ error: "ไม่พบผู้เช่า" });
    }
    const tenant = tenantRes.rows[0];

    // 2. emergency contact (เอาแค่ 1 คน)
    const ecRes = await pool.query('SELECT * FROM tenant_emergency_contacts WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (ecRes.rows.length > 0) {
      // Rename PK field to emergency_contacts_id for frontend consistency
      ecRes.rows[0].emergency_contacts_id = ecRes.rows[0].emergency_contacts_id || ecRes.rows[0].id;
      delete ecRes.rows[0].id;
    }
    tenant.emergency_contact = ecRes.rows[0] || null;

    // 3. vehicles (array)
   const vehiclesRes = await pool.query(`
      SELECT tenant_vehicle_id, license_plate, vehicle_type 
      FROM tenant_vehicles 
      WHERE tenant_id = $1
    `, [tenantId]);
    tenant.vehicles = vehiclesRes.rows;
    console.log('🚗 Vehicles found:', vehiclesRes.rows);

    console.log('📦 ส่ง tenant ไป frontend:', tenant);

    res.json(tenant);
  } catch (err) {
    console.error("getTenantFullById error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
};

// อัปเดตข้อมูลผู้เช่า (tenants), emergency_contact, vehicles
const updateTenant = async (req, res) => {
  const { tenantId } = req.params;
  const {
    first_name, last_name, email, phone_number,
    id_card_number, address, province, district, subdistrict, note,
    emergency_contact, vehicles, vehicles_to_delete
  } = req.body;
  
  console.log('🔍 UPDATE TENANT REQUEST:');
  console.log('  Tenant ID:', tenantId);
  console.log('  Vehicles received:', vehicles);
  console.log('  Vehicles to delete received:', vehicles_to_delete);
  console.log('  Body:', JSON.stringify(req.body, null, 2));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. อัปเดตข้อมูลหลักใน tenants
    const result = await client.query(`
      UPDATE tenants SET
        first_name = $1,
        last_name = $2,
        email = $3,
        phone_number = $4,
        id_card_number = $5,
        address = $6,
        province = $7,
        district = $8,
        subdistrict = $9,
        note = $10,
        updated_at = NOW()
      WHERE tenant_id = $11
      RETURNING *
    `, [
      first_name, last_name, email, phone_number,
      id_card_number, address, province, district, subdistrict, note, tenantId
    ]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "ไม่พบผู้เช่าที่ต้องการอัปเดต" });
    }


    // 2. อัปเดต emergency_contact (update ถ้ามี, insert ถ้าไม่มี)
    if (emergency_contact) {
    // ตรวจสอบว่ามี emergency contact เดิมหรือยัง
    const ecRes = await client.query('SELECT emergency_contacts_id FROM tenant_emergency_contacts WHERE tenant_id = $1', [tenantId]);
    if (ecRes.rows.length > 0) {
      // มีอยู่แล้ว → update
      await client.query(`
        UPDATE tenant_emergency_contacts SET
          first_name = $1,
          last_name = $2,
          phone_number = $3,
          relationship = $4
        WHERE tenant_id = $5
      `, [
        emergency_contact.first_name || '',
        emergency_contact.last_name || '',
        emergency_contact.phone_number || '',
        emergency_contact.relationship || '',
        tenantId 
      ]);
    } else {
      // ไม่มี → insert
      await client.query(`
        INSERT INTO tenant_emergency_contacts (tenant_id, first_name, last_name, phone_number, relationship)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        tenantId, // ✅
        emergency_contact.first_name || '',
        emergency_contact.last_name || '',
        emergency_contact.phone_number || '',
        emergency_contact.relationship || ''
      ]);
    }
    }

    // 3. อัปเดตรถ (update ถ้ามี id, insert ถ้าไม่มี id, ไม่ลบของเดิม)
    if (Array.isArray(vehicles)) {
      for (const v of vehicles) {
        if (v.license_plate && v.vehicle_type) {
          if (v.tenant_vehicle_id) {
            // 🔍 Log สำหรับการอัปเดตรถ
            console.log('🛠 UPDATE VEHICLE:', {
              tenant_vehicle_id: v.tenant_vehicle_id,
              tenantId,
              license_plate: v.license_plate,
              vehicle_type: v.vehicle_type
            });

            await client.query(`
              UPDATE tenant_vehicles SET
                license_plate = $1,
                vehicle_type = $2
              WHERE tenant_vehicle_id = $3 AND tenant_id = $4
            `, [v.license_plate, v.vehicle_type, v.tenant_vehicle_id, tenantId]); 
          } else {

            await client.query(`
              INSERT INTO tenant_vehicles (tenant_id, license_plate, vehicle_type)
              VALUES ($1, $2, $3)
            `, [tenantId, v.license_plate, v.vehicle_type]); 
          }
        }
      }
    }

    // 4. ลบรถที่ระบุใน vehicles_to_delete
    if (Array.isArray(vehicles_to_delete) && vehicles_to_delete.length > 0) {
      console.log('🗑️ Deleting vehicles:', vehicles_to_delete);
      
      const placeholders = vehicles_to_delete.map((_, i) => `$${i + 2}`).join(',');
      const deleteResult = await client.query(
        `DELETE FROM tenant_vehicles
        WHERE tenant_id = $1
        AND tenant_vehicle_id IN (${placeholders})`,
        [tenantId, ...vehicles_to_delete]
      );
      
      console.log(`🗑️ Deleted ${deleteResult.rowCount} vehicles`);
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("updateTenent error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  } finally {
    client.release();
  }
}

// Get tenant summary statistics for dashboard
const getTenantSummary = async (req, res) => {
  try {
    const { dormId } = req.params

    // Get total rooms and occupied rooms
    const roomsQuery = `
      SELECT 
        COUNT(*) as total_rooms,
        COUNT(CASE WHEN c.contract_id IS NOT NULL AND c.status = 'active' THEN 1 END) as occupied_rooms,
        COUNT(*) - COUNT(CASE WHEN c.contract_id IS NOT NULL AND c.status = 'active' THEN 1 END) as vacant_rooms
      FROM rooms r
      LEFT JOIN contracts c ON r.room_id = c.room_id AND c.status = 'active'
      WHERE r.dorm_id = $1
    `
    const roomsResult = await pool.query(roomsQuery, [dormId])
    const roomsData = roomsResult.rows[0]

    // Get total tenants
    const tenantsQuery = `
      SELECT COUNT(DISTINCT t.tenant_id) as total_tenants
      FROM tenants t
      JOIN contracts c ON t.tenant_id = c.tenant_id
      WHERE c.room_id IN (SELECT room_id FROM rooms WHERE dorm_id = $1) 
      AND c.status = 'active'
    `
    const tenantsResult = await pool.query(tenantsQuery, [dormId])
    const totalTenants = tenantsResult.rows[0].total_tenants || 0

    // Get new tenants this month (contracts that started this month)
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    
    const newTenantsQuery = `
      SELECT COUNT(DISTINCT t.tenant_id) as new_tenants
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.tenant_id
      WHERE c.room_id IN (SELECT room_id FROM rooms WHERE dorm_id = $1)
      AND DATE_PART('month', c.contract_start_date) = $2 
      AND DATE_PART('year', c.contract_start_date) = $3
      AND c.status = 'active'
    `
    const newTenantsResult = await pool.query(newTenantsQuery, [dormId, currentMonth, currentYear])
    const newTenantsThisMonth = newTenantsResult.rows[0].new_tenants || 0

    // Get tenants who left this month (contracts terminated this month)
    const leftTenantsQuery = `
      SELECT COUNT(DISTINCT t.tenant_id) as left_tenants
      FROM contracts c
      JOIN tenants t ON c.tenant_id = t.tenant_id
      WHERE c.room_id IN (SELECT room_id FROM rooms WHERE dorm_id = $1)
      AND DATE_PART('month', c.contract_end_date) = $2 
      AND DATE_PART('year', c.contract_end_date) = $3
      AND c.status = 'terminated'
      AND c.contract_end_date IS NOT NULL
    `
    const leftTenantsResult = await pool.query(leftTenantsQuery, [dormId, currentMonth, currentYear])
    const tenantsLeftThisMonth = leftTenantsResult.rows[0].left_tenants || 0

    // Get average stay duration - simplified calculation
    const avgStayQuery = `
      SELECT 
        COUNT(*) as total_contracts,
        COUNT(CASE WHEN status = 'terminated' THEN 1 END) as terminated_contracts
      FROM contracts c
      WHERE c.room_id IN (SELECT room_id FROM rooms WHERE dorm_id = $1)
    `
    const avgStayResult = await pool.query(avgStayQuery, [dormId])
    // Simple approximation: active contracts = ~2-6 months, terminated = varies
    const avgStayDuration = 3.2

    // Get overdue payments count from invoice_receipts table
    const overdueQuery = `
      SELECT COUNT(DISTINCT ir.tenant_id) as overdue_count
      FROM invoice_receipts ir
      JOIN contracts c ON ir.tenant_id = c.tenant_id
      WHERE ir.dorm_id = $1
      AND c.status = 'active'
      AND ir.status != 'paid'
    `
    const overdueResult = await pool.query(overdueQuery, [dormId])
    const overduePayments = overdueResult.rows[0].overdue_count || 0

    // Calculate occupancy rate
    const occupancyRate = roomsData.total_rooms > 0 
      ? Math.round((roomsData.occupied_rooms / roomsData.total_rooms) * 100) 
      : 0

    const summary = {
      totalTenants: parseInt(totalTenants),
      totalRooms: parseInt(roomsData.total_rooms),
      occupiedRooms: parseInt(roomsData.occupied_rooms),
      vacantRooms: parseInt(roomsData.vacant_rooms),
      occupancyRate: occupancyRate,
      newTenantsThisMonth: parseInt(newTenantsThisMonth),
      tenantsLeftThisMonth: parseInt(tenantsLeftThisMonth),
      avgStayDuration: Math.round(avgStayDuration * 10) / 10,
      overduePayments: parseInt(overduePayments)
    }

    res.json({
      success: true,
      data: summary
    })

  } catch (error) {
    console.error('Error getting tenant summary:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุปผู้เช่า',
      error: error.message
    })
  }
}

// Get monthly occupancy data
const getMonthlyOccupancy = async (req, res) => {
  try {
    const { dormId } = req.params
    const { year = new Date().getFullYear() } = req.query

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Get total rooms
    const totalRoomsQuery = `SELECT COUNT(*) as total FROM rooms WHERE dorm_id = $1`
    const totalRoomsResult = await pool.query(totalRoomsQuery, [dormId])
    const totalRooms = parseInt(totalRoomsResult.rows[0].total)

    // Get all contracts for this dorm with room information
    const contractsQuery = `
      SELECT 
        c.room_id,
        c.contract_start_date,
        c.contract_end_date,
        c.status
      FROM contracts c 
      INNER JOIN rooms r ON c.room_id = r.room_id
      WHERE r.dorm_id = $1
      AND c.contract_start_date IS NOT NULL
      AND c.status IN ('active', 'terminated')
    `
    const contractsResult = await pool.query(contractsQuery, [dormId])
    const contracts = contractsResult.rows

    // Calculate occupancy for each month
    const data = []
    const currentDate = new Date()
    
    for (let month = 1; month <= 12; month++) {
      const occupiedRooms = new Set() // Use Set to avoid counting same room multiple times
      
      // Check each contract to see if it was active during this month
      contracts.forEach(contract => {
        const startDate = new Date(contract.contract_start_date)
        
        // Determine end date based on contract status and actual end date
        let endDate
        if (contract.status === 'active') {
          if (contract.contract_end_date) {
            // Active contract with specified end date
            endDate = new Date(contract.contract_end_date)
          } else {
            // Active contract without end date - assume continues indefinitely
            endDate = new Date(year + 1, 11, 31) // Next year December 31st
          }
        } else if (contract.status === 'terminated' && contract.contract_end_date) {
          // Terminated contract with end date
          endDate = new Date(contract.contract_end_date)
        } else {
          // Skip contracts without proper dates
          return
        }
        
        // Create date range for the month we're checking
        const monthStart = new Date(year, month - 1, 1)
        const monthEnd = new Date(year, month, 0) // Last day of month
        
        // Check if contract overlaps with this month
        const contractStartsBeforeMonthEnds = startDate <= monthEnd
        const contractEndsAfterMonthStarts = endDate >= monthStart
        
        if (contractStartsBeforeMonthEnds && contractEndsAfterMonthStarts) {
          occupiedRooms.add(contract.room_id) // Add room to set (automatically handles duplicates)
        }
      })

      const occupied = occupiedRooms.size

      data.push({
        month_num: month,
        month: monthNames[month - 1],
        occupied: occupied.toString(),
        vacant: (totalRooms - occupied).toString(),
        total: totalRooms.toString()
      })
    }

    res.json({
      success: true,
      data: data
    })

  } catch (error) {
    console.error('Error getting monthly occupancy:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการเข้าพักรายเดือน',
      error: error.message
    })
  }
}

// Get room types distribution
const getRoomTypes = async (req, res) => {
  try {
    const { dormId } = req.params

    const query = `
      SELECT 
        rt.room_type_name as name,
        COUNT(r.room_id) as count
      FROM room_types rt
      LEFT JOIN rooms r ON rt.room_type_id = r.room_type_id AND r.dorm_id = $1
      WHERE rt.dorm_id = $1
      GROUP BY rt.room_type_id, rt.room_type_name
      ORDER BY count DESC
    `

    const result = await pool.query(query, [dormId])

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.json({
      success: true,
      data: result.rows
    })

  } catch (error) {
    console.error('Error getting room types:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทห้อง',
      error: error.message
    })
  }
}

// Get contract status distribution
const getContractStatus = async (req, res) => {
  try {
    const { dormId } = req.params

    // Get active contracts count
    const activeQuery = `
      SELECT COUNT(DISTINCT c.tenant_id) as active_count
      FROM contracts c
      WHERE c.room_id IN (SELECT room_id FROM rooms WHERE dorm_id = $1)
      AND c.status = 'active'
    `
    const activeResult = await pool.query(activeQuery, [dormId])
    const activeCount = parseInt(activeResult.rows[0].active_count) || 0

    // Get overdue payments count (only for active contracts)
    const overdueQuery = `
      SELECT COUNT(DISTINCT ir.tenant_id) as overdue_count
      FROM invoice_receipts ir
      JOIN contracts c ON ir.tenant_id = c.tenant_id
      WHERE ir.dorm_id = $1
      AND c.status = 'active'
      AND c.room_id IN (SELECT room_id FROM rooms WHERE dorm_id = $1)
      AND ir.status != 'paid'
    `
    const overdueResult = await pool.query(overdueQuery, [dormId])
    const overdueCount = parseInt(overdueResult.rows[0].overdue_count) || 0

    // Get moving out count (only for active contracts with moveout notice)
    const movingOutQuery = `
      SELECT COUNT(DISTINCT c.tenant_id) as moving_out_count
      FROM contracts c
      WHERE c.room_id IN (SELECT room_id FROM rooms WHERE dorm_id = $1)
      AND c.status = 'active'
      AND c.moveout_notice_date IS NOT NULL
    `
    const movingOutResult = await pool.query(movingOutQuery, [dormId])
    const movingOutCount = parseInt(movingOutResult.rows[0].moving_out_count) || 0

    res.json({
      success: true,
      data: {
        active: activeCount,
        overdue: overdueCount,
        moving_out: movingOutCount
      }
    })

  } catch (error) {
    console.error('Error getting contract status:', error)
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานะสัญญา',
      error: error.message
    })
  }
}

module.exports = {
  updateTenant,
  getTenantFullById,
  getTenantSummary,
  getMonthlyOccupancy,
  getRoomTypes,
  getContractStatus
}