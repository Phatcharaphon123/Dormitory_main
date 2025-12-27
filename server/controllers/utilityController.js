const prisma = require('../config/prisma');

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
    const existing = await prisma.utility_rates.findFirst({ where: { dorm_id: Number(dormId) } });

    if (existing) {
      // ถ้ามี → update
      const updated = await prisma.utility_rates.update({
        where: { utility_rate_id: existing.utility_rate_id },
        data: {
          water_rate: Number(water_rate),
          electricity_rate: Number(electricity_rate),
          updated_at: new Date(),
        },
      });
      res.json({ message: 'อัปเดตราคาสำเร็จ', data: updated });
    } else {
      // ถ้าไม่มี → insert (เพิ่ม start_date เป็นวันปัจจุบัน)
      const created = await prisma.utility_rates.create({
        data: {
          dorm_id: Number(dormId),
          water_rate: Number(water_rate),
          electricity_rate: Number(electricity_rate),
          start_date: new Date(),
        },
      });
      res.status(201).json({ message: 'เพิ่มราคาสำเร็จ', data: created });
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
    const result = await prisma.utility_rates.findFirst({ where: { dorm_id: Number(dormId) } });
    if (!result) {
      // ส่งข้อมูลเริ่มต้นแทนที่จะ return 404
      return res.json({
        utility_rate_id: null,
        dorm_id: Number(dormId),
        water_rate: 0,
        electricity_rate: 0,
        created_at: null,
        updated_at: null,
        start_date: null
      });
    }
    res.json(result);
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


    // Prisma aggregate with join
    const summary = await prisma.meter_readings.aggregate({
      _sum: {
        water_total_cost: true,
        electricity_total_cost: true,
        total_cost: true,
        water_unit_used: true,
        electric_unit_used: true,
      },
      _avg: {
        total_cost: true,
      },
      _count: {
        room_id: true,
      },
      where: {
        meter_records: {
          dorm_id: Number(dormId),
          meter_record_date: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
        },
      },
    });

    res.json({
      data: {
        currentWaterCost: Number(summary._sum.water_total_cost || 0),
        currentElectricityCost: Number(summary._sum.electricity_total_cost || 0),
        currentTotalCost: Number(summary._sum.total_cost || 0),
        avgPerRoom: Number(summary._avg.total_cost || 0),
        totalWaterUnits: Number(summary._sum.water_unit_used || 0),
        totalElectricityUnits: Number(summary._sum.electric_unit_used || 0),
        totalRooms: Number(summary._count.room_id || 0),
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
    // ...existing code...


    // Prisma: group by month
    const monthly = await prisma.meter_readings.groupBy({
      by: ['month'],
      where: {
        meter_records: {
          dorm_id: Number(dormId),
          meter_record_date: {
            gte: new Date(year, 0, 1),
            lt: new Date(Number(year) + 1, 0, 1),
          },
        },
      },
      _sum: {
        water_total_cost: true,
        electricity_total_cost: true,
        total_cost: true,
        water_unit_used: true,
        electric_unit_used: true,
      },
      orderBy: {
        month: 'asc',
      },
    });

    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthlyData = [];
    for (let i = 1; i <= 12; i++) {
      const monthData = monthly.find(row => row.month && (new Date(row.month).getMonth() + 1) === i);
      monthlyData.push({
        month: monthNames[i-1],
        monthNumber: i,
        water: Number(monthData?._sum.water_total_cost || 0),
        electricity: Number(monthData?._sum.electricity_total_cost || 0),
        total: Number(monthData?._sum.total_cost || 0),
        waterUnits: Number(monthData?._sum.water_unit_used || 0),
        electricityUnits: Number(monthData?._sum.electric_unit_used || 0),
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
    // ...existing code...


    // Prisma: group by year
    const yearly = await prisma.meter_readings.groupBy({
      by: ['month'],
      where: {
        meter_records: {
          dorm_id: Number(dormId),
        },
      },
      _sum: {
        water_total_cost: true,
        electricity_total_cost: true,
        total_cost: true,
      },
      orderBy: {
        month: 'desc',
      },
    });
    // Group by year
    const yearMap = {};
    yearly.forEach(row => {
      if (row.month) {
        const y = new Date(row.month).getFullYear();
        if (!yearMap[y]) {
          yearMap[y] = { year: y, water: 0, electricity: 0, total: 0 };
        }
        yearMap[y].water += Number(row._sum.water_total_cost || 0);
        yearMap[y].electricity += Number(row._sum.electricity_total_cost || 0);
        yearMap[y].total += Number(row._sum.total_cost || 0);
      }
    });
    const yearlyData = Object.values(yearMap).sort((a, b) => b.year - a.year).slice(0, 5);
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
    // ...existing code...


    // Prisma: get last 30 days
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 29);
    const readings = await prisma.meter_readings.findMany({
      where: {
        meter_records: {
          dorm_id: Number(dormId),
          meter_record_date: {
            gte: fromDate,
            lte: today,
          },
        },
      },
      include: {
        meter_records: true,
      },
      orderBy: {
        meter_records: { meter_record_date: 'asc' },
      },
    });

    // Group by date
    const dateMap = {};
    readings.forEach(r => {
      const d = r.meter_records?.meter_record_date?.toISOString().slice(0, 10);
      if (!d) return;
      if (!dateMap[d]) {
        dateMap[d] = { water: 0, electricity: 0 };
      }
      dateMap[d].water += Number(r.water_unit_used || 0);
      dateMap[d].electricity += Number(r.electric_unit_used || 0);
    });
    const dailyData = Object.entries(dateMap).map(([date, v], idx) => ({
      day: idx + 1,
      water: v.water,
      electricity: v.electricity,
      date,
    }));
    // ถ้าไม่มีข้อมูลจริง ให้สร้างข้อมูลจำลอง
    if (dailyData.length === 0) {
      for (let i = 0; i < 30; i++) {
        dailyData.push({
          day: i + 1,
          water: Math.floor(80 + Math.random() * 40),
          electricity: Math.floor(150 + Math.random() * 80),
        });
      }
    }
    res.json({ data: dailyData });

  } catch (err) {
    console.error("getDailyUtilityData error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
