const pool = require('../db');

// Get monthly income for current year
exports.getMonthlyIncome = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const monthlyIncomeQuery = `
      SELECT 
        DATE_PART('month', payment_date) as month,
        TO_CHAR(payment_date, 'Month') as month_name,
        COALESCE(SUM(total_amount), 0) as monthly_income,
        -- เพิ่ม breakdown ตามประเภท
        COALESCE(SUM(CASE WHEN source_type = 'monthly_payment' THEN total_amount ELSE 0 END), 0) as monthly_payment_income,
        COALESCE(SUM(CASE WHEN source_type = 'move_in' THEN total_amount ELSE 0 END), 0) as move_in_income,
        COALESCE(SUM(CASE WHEN source_type = 'move_out' THEN total_amount ELSE 0 END), 0) as move_out_income,
        COUNT(*) as transaction_count
      FROM (
        -- รายได้จากการชำระบิลรายเดือน
        SELECT p.payment_date, p.payment_amount as total_amount, 'monthly_payment' as source_type
        FROM payments p
        JOIN invoice_receipts i ON p.invoice_receipt_id = i.invoice_receipt_id
        JOIN rooms r ON i.room_id = r.room_id
        WHERE r.dorm_id = $1
          AND DATE_PART('year', p.payment_date) = $2
          AND p.payment_amount > 0
        
        UNION ALL
        
        -- รายได้จากค่าเข้าพัก
        SELECT mir.receipt_date as payment_date, mir.total_amount, 'move_in' as source_type
        FROM move_in_receipts mir
        JOIN contracts c ON mir.contract_id = c.contract_id
        JOIN rooms rm ON c.room_id = rm.room_id
        WHERE rm.dorm_id = $1
          AND DATE_PART('year', mir.receipt_date) = $2
          AND mir.total_amount > 0
        
        UNION ALL
        
        -- รายได้/รายจ่ายจากการย้ายออก (รวมการคืนเงิน)
        SELECT mor.receipt_date as payment_date, mor.net_amount as total_amount, 'move_out' as source_type
        FROM move_out_receipts mor
        JOIN contracts c2 ON mor.contract_id = c2.contract_id
        JOIN rooms rm2 ON c2.room_id = rm2.room_id
        WHERE rm2.dorm_id = $1
          AND DATE_PART('year', mor.receipt_date) = $2
      ) AS combined_income
      GROUP BY DATE_PART('month', payment_date), TO_CHAR(payment_date, 'Month')
      ORDER BY month
    `;
    
    const monthlyResults = await pool.query(monthlyIncomeQuery, [dormId, targetYear]);
    
    // Thai month names
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    
    // Create data for all 12 months
    const monthlyData = [];
    for (let i = 1; i <= 12; i++) {
      const monthData = monthlyResults.rows.find(row => parseInt(row.month) === i);
      monthlyData.push({
        month: thaiMonths[i - 1],
        monthNum: i,
        income: monthData ? parseFloat(monthData.monthly_income) : 0
      });
    }
    
    res.json({
      success: true,
      data: monthlyData
    });
    
  } catch (error) {
    console.error('Error fetching monthly income:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายได้รายเดือน',
      error: error.message
    });
  }
};

// Get yearly income
exports.getYearlyIncome = async (req, res) => {
  try {
    const { dormId } = req.params;
    
    const yearlyIncomeQuery = `
      SELECT 
        EXTRACT(YEAR FROM payment_date) as year,
        COALESCE(SUM(total_amount), 0) as yearly_income
      FROM (
        -- รายได้จากการชำระบิลรายเดือน
        SELECT p.payment_date, p.payment_amount as total_amount
        FROM payments p
        JOIN invoice_receipts i ON p.invoice_receipt_id = i.invoice_receipt_id
        JOIN rooms r ON i.room_id = r.room_id
        WHERE r.dorm_id = $1
          AND p.payment_amount > 0
        
        UNION ALL
        
        -- รายได้จากค่าเข้าพัก
        SELECT mir.receipt_date as payment_date, mir.total_amount
        FROM move_in_receipts mir
        JOIN contracts c ON mir.contract_id = c.contract_id
        JOIN rooms rm ON c.room_id = rm.room_id
        WHERE rm.dorm_id = $1
          AND mir.total_amount > 0
      ) AS combined_income
      GROUP BY EXTRACT(YEAR FROM payment_date)
      ORDER BY year DESC
      LIMIT 5
    `;
    
    const yearlyResults = await pool.query(yearlyIncomeQuery, [dormId]);
    
    const yearlyData = yearlyResults.rows.map(row => ({
      year: row.year.toString(),
      income: parseFloat(row.yearly_income)
    }));
    
    res.json({
      success: true,
      data: yearlyData
    });
    
  } catch (error) {
    console.error('Error fetching yearly income:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายได้รายปี',
      error: error.message
    });
  }
};

// Get dashboard summary statistics
exports.getIncomeSummary = async (req, res) => {
  try {
    const { dormId } = req.params;
    
    // Get total income this month from all payment sources (same as Receipts page)
    const currentMonthIncomeQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total_income
      FROM (
        -- รายได้จากการชำระบิลรายเดือน
        SELECT p.payment_amount as total_amount
        FROM payments p
        JOIN invoice_receipts i ON p.invoice_receipt_id = i.invoice_receipt_id
        JOIN rooms r ON i.room_id = r.room_id
        WHERE r.dorm_id = $1
          AND EXTRACT(MONTH FROM p.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM p.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND p.payment_amount > 0
        
        UNION ALL
        
        -- รายได้จากค่าเข้าพัก
        SELECT mir.total_amount
        FROM move_in_receipts mir
        JOIN contracts c ON mir.contract_id = c.contract_id
        JOIN rooms rm ON c.room_id = rm.room_id
        WHERE rm.dorm_id = $1
          AND EXTRACT(MONTH FROM mir.receipt_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM mir.receipt_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND mir.total_amount > 0
        
        UNION ALL
        
        -- รายได้/รายจ่ายจากการย้ายออก (รวมการคืนเงิน)
        SELECT mor.net_amount as total_amount
        FROM move_out_receipts mor
        JOIN contracts c2 ON mor.contract_id = c2.contract_id
        JOIN rooms rm2 ON c2.room_id = rm2.room_id
        WHERE rm2.dorm_id = $1
          AND EXTRACT(MONTH FROM mor.receipt_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM mor.receipt_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      ) AS combined_income
    `;
    
    // Get total fines/penalties (รวมค่าปรับล่าช้าและค่าปรับการย้ายออก)
    const totalFinesQuery = `
      SELECT COALESCE(SUM(total_fines), 0) as total_fines
      FROM (
        -- ค่าปรับล่าช้าจากใบแจ้งหนี้ที่ชำระแล้ว
        SELECT COALESCE(SUM(iri.amount), 0) as total_fines
        FROM invoice_receipt_items iri
        JOIN invoice_receipts ir ON iri.invoice_receipt_id = ir.invoice_receipt_id
        JOIN payments p ON ir.invoice_receipt_id = p.invoice_receipt_id
        JOIN rooms r ON ir.room_id = r.room_id
        WHERE r.dorm_id = $1
          AND iri.item_type = 'late_fee'
          AND iri.amount > 0
          AND EXTRACT(MONTH FROM p.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM p.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND p.payment_amount > 0
        
        UNION ALL
        
        -- ค่าปรับจากการย้ายออก
        SELECT COALESCE(SUM(mori.total_price), 0) as total_fines
        FROM move_out_receipt_items mori
        JOIN move_out_receipts mor ON mori.move_out_receipt_id = mor.move_out_receipt_id
        JOIN contracts c ON mor.contract_id = c.contract_id
        JOIN rooms r ON c.room_id = r.room_id
        WHERE r.dorm_id = $1
          AND mori.item_type = 'penalty'
          AND EXTRACT(MONTH FROM mor.move_out_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM mor.move_out_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND mori.total_price > 0
      ) AS all_fines
    `;
    
    // Get room statistics
    const roomStatsQuery = `
      SELECT 
        COUNT(*) as total_rooms,
        COUNT(c.contract_id) as occupied_rooms
      FROM rooms r
      LEFT JOIN contracts c ON r.room_id = c.room_id 
        AND c.status = 'active'
      WHERE r.dorm_id = $1
    `;
    
    const incomeResult = await pool.query(currentMonthIncomeQuery, [dormId]);
    const finesResult = await pool.query(totalFinesQuery, [dormId]);
    const roomStatsResult = await pool.query(roomStatsQuery, [dormId]);
    
    const summary = {
      totalIncome: parseFloat(incomeResult.rows[0]?.total_income) || 0,
      totalFines: parseFloat(finesResult.rows[0]?.total_fines) || 0,
      currentTenants: parseInt(roomStatsResult.rows[0]?.occupied_rooms) || 0,
      totalRooms: parseInt(roomStatsResult.rows[0]?.total_rooms) || 0,
      vacantRooms: (parseInt(roomStatsResult.rows[0]?.total_rooms) || 0) - (parseInt(roomStatsResult.rows[0]?.occupied_rooms) || 0)
    };
    
    res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('Error fetching income summary:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสรุปรายได้',
      error: error.message
    });
  }
};

// Get income breakdown by type
exports.getIncomeBreakdown = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { month, year } = req.query;
    
    // Default to current month/year if not provided
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const breakdownQuery = `
      SELECT 
        'rent' as type,
        'ค่าเช่า' as name,
        COALESCE(SUM(rent_amount), 0) as amount
      FROM (
        SELECT 
          CASE 
            WHEN iri.item_type = 'rent' THEN iri.price * iri.unit_count
            ELSE 0
          END as rent_amount
        FROM invoice_receipt_items iri
        JOIN invoice_receipts ir ON iri.invoice_receipt_id = ir.invoice_receipt_id
        JOIN payments p ON ir.invoice_receipt_id = p.invoice_receipt_id
        JOIN rooms r ON ir.room_id = r.room_id
        WHERE r.dorm_id = $1
          AND EXTRACT(MONTH FROM p.payment_date) = $2
          AND EXTRACT(YEAR FROM p.payment_date) = $3
          AND p.payment_amount > 0
      ) rent_data
      
      UNION ALL
      
      SELECT 
        'electricity' as type,
        'ค่าไฟ' as name,
        COALESCE(SUM(electricity_amount), 0) as amount
      FROM (
        -- ค่าไฟจากบิลรายเดือน
        SELECT 
          CASE 
            WHEN iri.item_type = 'electric' THEN iri.price * iri.unit_count
            ELSE 0
          END as electricity_amount
        FROM invoice_receipt_items iri
        JOIN invoice_receipts ir ON iri.invoice_receipt_id = ir.invoice_receipt_id
        JOIN payments p ON ir.invoice_receipt_id = p.invoice_receipt_id
        JOIN rooms r ON ir.room_id = r.room_id
        WHERE r.dorm_id = $1
          AND EXTRACT(MONTH FROM p.payment_date) = $2
          AND EXTRACT(YEAR FROM p.payment_date) = $3
          AND p.payment_amount > 0
        
        UNION ALL
        
        -- ค่าไฟจากการย้ายออก
        SELECT 
          CASE 
            WHEN mori.item_type = 'meter' AND mori.description LIKE '%ค่าไฟ%' THEN mori.total_price
            ELSE 0
          END as electricity_amount
        FROM move_out_receipt_items mori
        JOIN move_out_receipts mor ON mori.move_out_receipt_id = mor.move_out_receipt_id
        JOIN contracts c ON mor.contract_id = c.contract_id
        JOIN rooms r ON c.room_id = r.room_id
        WHERE r.dorm_id = $1
          AND EXTRACT(MONTH FROM mor.move_out_date) = $2
          AND EXTRACT(YEAR FROM mor.move_out_date) = $3
          AND mori.total_price > 0
      ) electricity_data
      
      UNION ALL
      
      SELECT 
        'water' as type,
        'ค่าน้ำ' as name,
        COALESCE(SUM(water_amount), 0) as amount
      FROM (
        -- ค่าน้ำจากบิลรายเดือน
        SELECT 
          CASE 
            WHEN iri.item_type = 'water' THEN iri.price * iri.unit_count
            ELSE 0
          END as water_amount
        FROM invoice_receipt_items iri
        JOIN invoice_receipts ir ON iri.invoice_receipt_id = ir.invoice_receipt_id
        JOIN payments p ON ir.invoice_receipt_id = p.invoice_receipt_id
        JOIN rooms r ON ir.room_id = r.room_id
        WHERE r.dorm_id = $1
          AND EXTRACT(MONTH FROM p.payment_date) = $2
          AND EXTRACT(YEAR FROM p.payment_date) = $3
          AND p.payment_amount > 0
        
        UNION ALL
        
        -- ค่าน้ำจากการย้ายออก
        SELECT 
          CASE 
            WHEN mori.item_type = 'meter' AND mori.description LIKE '%ค่าน้ำ%' THEN mori.total_price
            ELSE 0
          END as water_amount
        FROM move_out_receipt_items mori
        JOIN move_out_receipts mor ON mori.move_out_receipt_id = mor.move_out_receipt_id
        JOIN contracts c ON mor.contract_id = c.contract_id
        JOIN rooms r ON c.room_id = r.room_id
        WHERE r.dorm_id = $1
          AND EXTRACT(MONTH FROM mor.move_out_date) = $2
          AND EXTRACT(YEAR FROM mor.move_out_date) = $3
          AND mori.total_price > 0
      ) water_data
      
      UNION ALL
      
      SELECT 
        'fines' as type,
        'ค่าปรับ' as name,
        COALESCE(SUM(fine_amount), 0) as amount
      FROM (
        -- ค่าปรับล่าช้าจากใบแจ้งหนี้ที่ชำระแล้ว
        SELECT 
          CASE 
            WHEN iri.item_type = 'late_fee' THEN iri.amount
            ELSE 0
          END as fine_amount
        FROM invoice_receipt_items iri
        JOIN invoice_receipts ir ON iri.invoice_receipt_id = ir.invoice_receipt_id
        JOIN payments p ON ir.invoice_receipt_id = p.invoice_receipt_id
        JOIN rooms r ON ir.room_id = r.room_id
        WHERE r.dorm_id = $1
          AND EXTRACT(MONTH FROM p.payment_date) = $2
          AND EXTRACT(YEAR FROM p.payment_date) = $3
          AND p.payment_amount > 0
          AND iri.amount > 0
        
        UNION ALL
        
        -- ค่าปรับจากการย้ายออก
        SELECT 
          CASE 
            WHEN mori.item_type = 'penalty' THEN mori.total_price
            ELSE 0
          END as fine_amount
        FROM move_out_receipt_items mori
        JOIN move_out_receipts mor ON mori.move_out_receipt_id = mor.move_out_receipt_id
        JOIN contracts c ON mor.contract_id = c.contract_id
        JOIN rooms r ON c.room_id = r.room_id
        WHERE r.dorm_id = $1
          AND EXTRACT(MONTH FROM mor.move_out_date) = $2
          AND EXTRACT(YEAR FROM mor.move_out_date) = $3
          AND mori.total_price > 0
      ) fine_data
    `;
    
    const result = await pool.query(breakdownQuery, [dormId, targetMonth, targetYear]);
    
    const breakdown = result.rows.map(row => ({
      type: row.type,
      name: row.name,
      amount: parseFloat(row.amount)
    }));
    
    res.json({
      success: true,
      data: breakdown
    });
    
  } catch (error) {
    console.error('Error fetching income breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการแยกประเภทรายได้',
      error: error.message
    });
  }
};

// Get service fees from various sources
exports.getServiceFees = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { month, year } = req.query;
    
    // Default to current month/year if not provided
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // ค่าบริการรายเดือนจาก MonthDetailBills (ใบแจ้งหนี้รายเดือน)
    const monthlyServiceQuery = `
      SELECT COALESCE(SUM(iri.price * iri.unit_count), 0) as monthly_service
      FROM invoice_receipt_items iri
      JOIN invoice_receipts ir ON iri.invoice_receipt_id = ir.invoice_receipt_id
      JOIN payments p ON ir.invoice_receipt_id = p.invoice_receipt_id
      JOIN rooms r ON ir.room_id = r.room_id
      WHERE r.dorm_id = $1
        AND iri.item_type = 'service'
        AND EXTRACT(MONTH FROM p.payment_date) = $2
        AND EXTRACT(YEAR FROM p.payment_date) = $3
        AND p.payment_amount > 0
    `;
    
    // ค่าบริการตอนทำสัญญาจาก MonthlyContract (ใบเสร็จรับเงินเข้าพัก)
    const contractServiceQuery = `
      SELECT COALESCE(SUM(miri.total_price), 0) as contract_service
      FROM move_in_receipt_items miri
      JOIN move_in_receipts mir ON miri.move_in_receipt_id = mir.move_in_receipt_id
      JOIN contracts c ON mir.contract_id = c.contract_id
      JOIN rooms r ON c.room_id = r.room_id
      WHERE r.dorm_id = $1
        AND miri.item_type = 'service'
        AND EXTRACT(MONTH FROM mir.receipt_date) = $2
        AND EXTRACT(YEAR FROM mir.receipt_date) = $3
        AND miri.total_price > 0
    `;
    
    // ค่าบริการย้ายออกจาก CancelContract (ใบเสร็จรับเงินย้ายออก)
    const moveoutServiceQuery = `
      SELECT COALESCE(SUM(mori.total_price), 0) as moveout_service
      FROM move_out_receipt_items mori
      JOIN move_out_receipts mor ON mori.move_out_receipt_id = mor.move_out_receipt_id
      JOIN contracts c ON mor.contract_id = c.contract_id
      JOIN rooms r ON c.room_id = r.room_id
      WHERE r.dorm_id = $1
        AND mori.item_type = 'service'
        AND EXTRACT(MONTH FROM mor.receipt_date) = $2
        AND EXTRACT(YEAR FROM mor.receipt_date) = $3
        AND mori.total_price > 0
    `;
    
    // Execute all queries in parallel
    const [monthlyResult, contractResult, moveoutResult] = await Promise.all([
      pool.query(monthlyServiceQuery, [dormId, targetMonth, targetYear]),
      pool.query(contractServiceQuery, [dormId, targetMonth, targetYear]),
      pool.query(moveoutServiceQuery, [dormId, targetMonth, targetYear])
    ]);
    
    const monthlyService = parseFloat(monthlyResult.rows[0]?.monthly_service || 0);
    const contractService = parseFloat(contractResult.rows[0]?.contract_service || 0);
    const moveoutService = parseFloat(moveoutResult.rows[0]?.moveout_service || 0);
    const totalService = monthlyService + contractService + moveoutService;

    res.json({
      success: true,
      data: {
        monthly_service: monthlyService,
        contract_service: contractService,
        moveout_service: moveoutService,
        total: totalService
      }
    });
    
  } catch (error) {
    console.error('Error fetching service fees:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลค่าบริการ',
      error: error.message
    });
  }
};

// Get monthly occupancy data for income dashboard
exports.getMonthlyOccupancy = async (req, res) => {
  try {
    const { dormId } = req.params;
    const { month, year } = req.query;
    
    // Default to current month/year if not provided
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // First, let's check all contracts to debug
    const debugQuery = `
      SELECT 
        c.contract_id,
        c.room_id,
        c.contract_start_date,
        c.contract_end_date,
        c.status,
        r.dorm_id
      FROM contracts c 
      INNER JOIN rooms r ON c.room_id = r.room_id
      WHERE r.dorm_id = $1
      ORDER BY c.contract_start_date
    `;
    
    const debugResult = await pool.query(debugQuery, [dormId]);
    
    // Get total rooms for this dormitory
    const totalRoomsQuery = `SELECT COUNT(*) as total FROM rooms WHERE dorm_id = $1`;
    const totalRoomsResult = await pool.query(totalRoomsQuery, [dormId]);
    const totalRooms = parseInt(totalRoomsResult.rows[0].total);
    
    // Get occupied rooms for the specific month and year
    // Count all contracts that were active during the selected month, regardless of current status
    const occupancyQuery = `
      SELECT 
        COUNT(DISTINCT c.room_id) as occupied_rooms,
        COUNT(*) as total_contracts,
        ARRAY_AGG(DISTINCT c.contract_id) as contract_ids,
        ARRAY_AGG(DISTINCT c.room_id) as room_ids,
        ARRAY_AGG(DISTINCT c.contract_start_date::text) as start_dates,
        ARRAY_AGG(DISTINCT c.contract_end_date::text) as end_dates
      FROM contracts c 
      INNER JOIN rooms r ON c.room_id = r.room_id
      WHERE r.dorm_id = $1
        AND c.contract_start_date IS NOT NULL
        AND (
          -- เงื่อนไข 1: สัญญาเริ่มในเดือนที่เลือก
          (
            EXTRACT(MONTH FROM c.contract_start_date) = $2 
            AND EXTRACT(YEAR FROM c.contract_start_date) = $3
          )
          OR
          -- เงื่อนไข 2: สัญญาเริ่มก่อนเดือนที่เลือกและยังมีผลอยู่ในเดือนนั้น
          (
            c.contract_start_date < ($3 || '-' || LPAD($2::text, 2, '0') || '-01')::date
            AND (
              c.contract_end_date IS NULL 
              OR c.contract_end_date >= ($3 || '-' || LPAD($2::text, 2, '0') || '-01')::date
            )
          )
        )
    `;
    
    const occupancyResult = await pool.query(occupancyQuery, [dormId, targetMonth, targetYear]);
    const occupiedRooms = parseInt(occupancyResult.rows[0].occupied_rooms) || 0;
    const totalContracts = parseInt(occupancyResult.rows[0].total_contracts) || 0;
    const contractIds = occupancyResult.rows[0].contract_ids || [];
    const roomIds = occupancyResult.rows[0].room_ids || [];
    const startDates = occupancyResult.rows[0].start_dates || [];
    const endDates = occupancyResult.rows[0].end_dates || [];
    const vacantRooms = totalRooms - occupiedRooms;

    const data = {
      totalRooms,
      occupiedRooms,
      vacantRooms,
      occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      month: targetMonth,
      year: targetYear
    };
    
    res.json({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error('Error fetching monthly occupancy:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการเข้าพักรายเดือน',
      error: error.message
    });
  }
};
