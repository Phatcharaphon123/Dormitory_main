
const {fetchSensorDormitoryLatest, fetchSensorDormitory} = require('../influxdb/query'); //คอนฟิกการเชื่อมต่อ influxdb
const DormitoryLatest = async (req, res) => { 
    try {
      const results = await fetchSensorDormitoryLatest();
      res.json({sensor: results});
    } catch(error) {
      console.error('INFLUX ERROR in DormitoryLatest:', error);
      res.status(500).json({ message: 'Failed to fetch car data', error: String(error) });
    }
  }
const Dormitory = async (req, res) => { 
  try {
    const results = await fetchSensorDormitory();
    res.json({sensor: results});
  } catch(error) {
    res.status(500).json({ message: 'Failed to fetch car data', error: String(error) });
  }
}

module.exports = {
    DormitoryLatest,
    Dormitory
};