const express = require('express');
const router = express.Router();
const { InfluxDB } = require('@influxdata/influxdb-client');
const authMiddleware = require('../middleware/authMiddleware');

// ตั้งค่า InfluxDB
const url = process.env.INFLUX_URL;
const token = process.env.INFLUX_TOKEN;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;

const influxDB = new InfluxDB({ url, token });
const queryApi = influxDB.getQueryApi(org);

// API สำหรับตรวจสอบ measurement ใน InfluxDB
router.post('/validate-measurement', authMiddleware, async (req, res) => {
  try {
    const { measurement } = req.body;
    
    if (!measurement) {
      return res.status(400).json({ 
        error: 'กรุณาระบุ measurement ที่ต้องการตรวจสอบ',
        exists: false 
      });
    }

    // Query เพื่อหา measurement ใน InfluxDB (ช่วง 30 วันที่ผ่านมา)
    const fluxQuery = `
      from(bucket: "${bucket}")
        |> range(start: -30d)
        |> filter(fn: (r) => r._measurement == "${measurement}")
        |> limit(n: 1)
    `;

    let dataFound = false;

    await new Promise((resolve, reject) => {
      queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          // ถ้าพบข้อมูลอย่างน้อย 1 แถว แสดงว่า measurement มีอยู่จริง
          dataFound = true;
        },
        error(error) {
          console.error("InfluxDB Error:", error);
          reject(error);
        },
        complete() {
          resolve();
        }
      });
    });

    res.json({ 
      exists: dataFound,
      measurement: measurement,
      message: dataFound 
        ? `พบ measurement "${measurement}" ใน InfluxDB` 
        : `ไม่พบ measurement "${measurement}" ใน InfluxDB`
    });

  } catch (error) {
    console.error('Error validating measurement:', error);
    res.status(500).json({ 
      error: 'เกิดข้อผิดพลาดในการตรวจสอบ measurement',
      exists: false,
      details: error.message 
    });
  }
});

// API สำหรับดูรายการ measurement ทั้งหมดใน InfluxDB
router.get('/measurements', authMiddleware, async (req, res) => {
  try {
    // Query เพื่อดูรายการ measurement ทั้งหมด (ช่วง 7 วันที่ผ่านมา)
    const fluxQuery = `
      import "influxdata/influxdb/schema"
      schema.measurements(bucket: "${bucket}")
    `;

    const measurements = [];

    await new Promise((resolve, reject) => {
      queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          if (o._value) {
            measurements.push(o._value);
          }
        },
        error(error) {
          console.error("InfluxDB Error:", error);
          reject(error);
        },
        complete() {
          resolve();
        }
      });
    });

    res.json({ 
      measurements: [...new Set(measurements)], // ลบ duplicate
      count: measurements.length
    });

  } catch (error) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({ 
      error: 'เกิดข้อผิดพลาดในการดึงรายการ measurement',
      details: error.message 
    });
  }
});

// API สำหรับดึงข้อมูลล่าสุดจาก InfluxDB สำหรับ measurement ที่กำหนด
router.post('/latest-data', authMiddleware, async (req, res) => {
  try {
    const { measurement } = req.body;
    
    if (!measurement) {
      return res.status(400).json({ 
        error: 'กรุณาระบุ measurement ที่ต้องการดึงข้อมูล'
      });
    }

    // Query เพื่อดึงข้อมูลล่าสุดจาก InfluxDB
    const fluxQuery = `
      from(bucket: "${bucket}")
        |> range(start: -2h)
        |> filter(fn: (r) => r._measurement == "${measurement}")
        |> last()
    `;

    const results = [];

    await new Promise((resolve, reject) => {
      queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          results.push({
            field: o._field,
            value: o._value,
            time: o._time
          });
        },
        error(error) {
          console.error("InfluxDB Error:", error);
          reject(error);
        },
        complete() {
          resolve();
        }
      });
    });

    // แปลงข้อมูลเป็นรูปแบบที่ใช้งานง่าย
    const data = {};
    let latestTime = null;

    for (const { field, value, time } of results) {
      if (time && (!latestTime || time > latestTime)) {
        latestTime = time;
      }
      data[field] = value;
    }

    res.json({ 
      success: true,
      measurement: measurement,
      data: data,
      timestamp: latestTime,
      hasData: results.length > 0
    });

  } catch (error) {
    console.error('Error fetching latest data:', error);
    res.status(500).json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลล่าสุด',
      details: error.message 
    });
  }
});

module.exports = router;