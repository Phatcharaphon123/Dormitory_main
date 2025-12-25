const pool = require('../db');

//  สร้างหรืออัปเดตค่าน้ำ-ไฟของหอพัก
exports.upsertUtilityRates = async (req, res) => {
  const dormId = req.params.dormId;
  const { water_rate, electricity_rate } = req.body;

  try {
    // Validation
    if (!water_rate || !electricity_rate || water_rate < 0 || electricity_rate < 0) {
      return res.status(400).json({ 
        error: "กรุณากรอกค่าน้ำและค่าไฟที่ถูกต้อง (ต้องเป็นตัวเลขที่มากกว่า 0)" 
      });
    }

    // ตรวจว่ามีข้อมูลเดิมอยู่หรือไม่
    const check = await pool.query(
      'SELECT * FROM utility_rates WHERE dorm_id = $1',
      [dormId]
    );

    if (check.rows.length > 0) {
      // ถ้ามี → update
      const result = await pool.query(`
        UPDATE utility_rates SET 
          water_rate = $1,
          electricity_rate = $2,
          updated_at = NOW()
        WHERE dorm_id = $3
        RETURNING *`,
        [water_rate, electricity_rate, dormId]
      );

      res.json({ message: 'อัปเดตราคาสำเร็จ', data: result.rows[0] });
    } else {
      // ถ้าไม่มี → insert (เพิ่ม start_date เป็นวันปัจจุบัน)
      const result = await pool.query(`
        INSERT INTO utility_rates (dorm_id, water_rate, electricity_rate, start_date)
        VALUES ($1, $2, $3, CURRENT_DATE)
        RETURNING *`,
        [dormId, water_rate, electricity_rate]
      );

      res.status(201).json({ message: 'เพิ่มราคาสำเร็จ', data: result.rows[0] });
    }

  } catch (err) {
    console.error("upsertUtilityRates error:", err);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
};

//  ดึงค่าน้ำ-ไฟของหอพัก
exports.getUtilityRates = async (req, res) => {
  const dormId = req.params.dormId;

  try {
    const result = await pool.query(
      'SELECT * FROM utility_rates WHERE dorm_id = $1',
      [dormId]
    );

    if (result.rows.length === 0) {
      // ส่งข้อมูลเริ่มต้นแทนที่จะ return 404
      return res.json({
        utility_rate_id: null,
        dorm_id: parseInt(dormId),
        water_rate: 0,
        electricity_rate: 0,
        created_at: null,
        updated_at: null,
        start_date: null
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("getUtilityRates error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//  ดึงสรุปข้อมูลการใช้สาธารณูปโภค
exports.getUtilitySummary = async (req, res) => {
  const dormId = req.params.dormId;
  const queryYear = req.query.year || new Date().getFullYear();
  const queryMonth = req.query.month || new Date().getMonth() + 1;

  try {
    // ใช้ปีและเดือนจาก query parameters หรือใช้ปัจจุบัน
    const year = parseInt(queryYear);
    const month = parseInt(queryMonth);

    const summaryQuery = `
      SELECT 
        SUM(mr.water_total_cost) as current_water_cost,
        SUM(mr.electricity_total_cost) as current_electricity_cost,
        SUM(mr.total_cost) as current_total_cost,
        AVG(mr.total_cost) as avg_per_room,
        SUM(mr.water_unit_used) as total_water_units,
        SUM(mr.electric_unit_used) as total_electricity_units,
        COUNT(DISTINCT mr.room_id) as total_rooms
      FROM meter_readings mr
      JOIN meter_records rec ON mr.meter_record_id = rec.meter_record_id
      WHERE rec.dorm_id = $1 
        AND EXTRACT(YEAR FROM rec.meter_record_date) = $2 
        AND EXTRACT(MONTH FROM rec.meter_record_date) = $3
    `;

    const summaryResult = await pool.query(summaryQuery, [dormId, year, month]);
    const summary = summaryResult.rows[0];

    res.json({
      data: {
        currentWaterCost: parseFloat(summary.current_water_cost || 0),
        currentElectricityCost: parseFloat(summary.current_electricity_cost || 0),
        currentTotalCost: parseFloat(summary.current_total_cost || 0),
        avgPerRoom: parseFloat(summary.avg_per_room || 0),
        totalWaterUnits: parseInt(summary.total_water_units || 0),
        totalElectricityUnits: parseInt(summary.total_electricity_units || 0),
        totalRooms: parseInt(summary.total_rooms || 0)
      }
    });

  } catch (err) {
    console.error("getUtilitySummary error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//  ดึงข้อมูลการใช้รายเดือน
exports.getMonthlyUtilityData = async (req, res) => {
  const dormId = req.params.dormId;
  const year = req.query.year || new Date().getFullYear();

  try {
    const monthlyQuery = `
      SELECT 
        EXTRACT(MONTH FROM rec.meter_record_date) as month,
        SUM(mr.water_total_cost) as water_cost,
        SUM(mr.electricity_total_cost) as electricity_cost,
        SUM(mr.total_cost) as total_cost,
        SUM(mr.water_unit_used) as water_units,
        SUM(mr.electric_unit_used) as electricity_units
      FROM meter_readings mr
      JOIN meter_records rec ON mr.meter_record_id = rec.meter_record_id
      WHERE rec.dorm_id = $1 
        AND EXTRACT(YEAR FROM rec.meter_record_date) = $2
      GROUP BY EXTRACT(MONTH FROM rec.meter_record_date)
      ORDER BY month
    `;

    const monthlyResult = await pool.query(monthlyQuery, [dormId, year]);
    
    // สร้างข้อมูล 12 เดือน (เติมข้อมูลที่ขาดหายด้วย 0)
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
                       'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    
    const monthlyData = [];
    for (let i = 1; i <= 12; i++) {
      const monthData = monthlyResult.rows.find(row => parseInt(row.month) === i);
      monthlyData.push({
        month: monthNames[i-1],
        monthNumber: i,
        water: parseFloat(monthData?.water_cost || 0),
        electricity: parseFloat(monthData?.electricity_cost || 0),
        total: parseFloat(monthData?.total_cost || 0),
        waterUnits: parseInt(monthData?.water_units || 0),
        electricityUnits: parseInt(monthData?.electricity_units || 0)
      });
    }

    res.json({ data: monthlyData });

  } catch (err) {
    console.error("getMonthlyUtilityData error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//  ดึงข้อมูลการใช้รายปี
exports.getYearlyUtilityData = async (req, res) => {
  const dormId = req.params.dormId;

  try {
    const yearlyQuery = `
      SELECT 
        EXTRACT(YEAR FROM rec.meter_record_date) as year,
        SUM(mr.water_total_cost) as water_cost,
        SUM(mr.electricity_total_cost) as electricity_cost,
        SUM(mr.total_cost) as total_cost
      FROM meter_readings mr
      JOIN meter_records rec ON mr.meter_record_id = rec.meter_record_id
      WHERE rec.dorm_id = $1
      GROUP BY EXTRACT(YEAR FROM rec.meter_record_date)
      ORDER BY year DESC
      LIMIT 5
    `;

    const yearlyResult = await pool.query(yearlyQuery, [dormId]);
    
    const yearlyData = yearlyResult.rows.map(row => ({
      year: row.year.toString(),
      water: parseFloat(row.water_cost || 0),
      electricity: parseFloat(row.electricity_cost || 0),
      total: parseFloat(row.total_cost || 0)
    }));

    res.json({ data: yearlyData });

  } catch (err) {
    console.error("getYearlyUtilityData error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//  ดึงข้อมูลการใช้รายวัน (30 วันย้อนหลัง)
exports.getDailyUtilityData = async (req, res) => {
  const dormId = req.params.dormId;

  try {
    // ดึงข้อมูลการใช้ไฟฟ้าและน้ำรายวันจาก meter readings ล่าสุด 30 วัน
    const dailyQuery = `
      SELECT 
        DATE(mr.meter_record_date) as record_date,
        SUM(
          CASE 
            WHEN lag_readings.water_curr IS NOT NULL 
            THEN mr_readings.water_curr - lag_readings.water_curr 
            ELSE 0 
          END
        ) as daily_water_units,
        SUM(
          CASE 
            WHEN lag_readings.electric_curr IS NOT NULL 
            THEN mr_readings.electric_curr - lag_readings.electric_curr 
            ELSE 0 
          END
        ) as daily_electricity_units
      FROM meter_records mr
      JOIN meter_readings mr_readings ON mr.meter_record_id = mr_readings.meter_record_id
      LEFT JOIN LATERAL (
        SELECT water_curr, electric_curr
        FROM meter_readings mr_prev
        JOIN meter_records mr_prev_record ON mr_prev.meter_record_id = mr_prev_record.meter_record_id
        WHERE mr_prev.room_id = mr_readings.room_id 
          AND mr_prev_record.meter_record_date < mr.meter_record_date
          AND mr_prev_record.dorm_id = $1
        ORDER BY mr_prev_record.meter_record_date DESC
        LIMIT 1
      ) lag_readings ON true
      WHERE mr.dorm_id = $1
        AND mr.meter_record_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(mr.meter_record_date)
      ORDER BY record_date DESC
      LIMIT 30
    `;

    const dailyResult = await pool.query(dailyQuery, [dormId]);
    
    // ถ้าไม่มีข้อมูลจริง ให้สร้างข้อมูลจำลอง
    let dailyData;
    if (dailyResult.rows.length === 0) {
      dailyData = Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        water: Math.floor(80 + Math.random() * 40),
        electricity: Math.floor(150 + Math.random() * 80)
      }));
    } else {
      dailyData = dailyResult.rows.reverse().map((row, index) => ({
        day: index + 1,
        water: parseInt(row.daily_water_units || 0),
        electricity: parseInt(row.daily_electricity_units || 0),
        date: row.record_date
      }));
    }

    res.json({ data: dailyData });

  } catch (err) {
    console.error("getDailyUtilityData error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
