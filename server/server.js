const express = require('express');
const cors = require('cors');
const { InfluxDB } = require('@influxdata/influxdb-client');

// Import แยกตาม Routes modules
const authRoutes = require('./routes/authRoutes');
const dormitoryRoutes = require('./routes/dormitoryRoutes');
const roomTypeRoutes = require('./routes/roomTypeRoutes');
const roomRoutes = require('./routes/roomRoutes');
const contractRoutes = require('./routes/contractRoutes');
const roomStatusRoutes = require('./routes/roomStatusRoutes');
const utilityRoutes = require('./routes/utilityRoutes');
const tenantsRoutes = require('./routes/tenantsRoutes');
const meterRecordRoutes = require('./routes/meterRecordRoutes');
const billRoutes = require('./routes/billRoutes');
const meterRoutes = require('./routes/meterRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const moveOutReceiptRoutes = require('./routes/moveOutReceiptRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const senserDormitoryRoutes = require('./routes/senserDormitoryRoutes'); 
const influxRoutes = require('./routes/influxRoutes'); 


// สร้างแอป Express

const app = express();
app.use(cors());
app.use(express.json());

// ใช้ routes แยกตาม functionality
app.use('/api/auth', authRoutes);           
app.use('/api/dormitories', dormitoryRoutes);      
app.use('/api/room-types', roomTypeRoutes);      
app.use('/api/rooms', roomRoutes);           
app.use('/api/contracts', contractRoutes);       
app.use('/api/room-status', roomStatusRoutes);
app.use('/api/utilities', utilityRoutes);     
app.use('/api/tenants', tenantsRoutes);
app.use('/api/meter-records', meterRecordRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/meters', meterRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/move-out-receipts', moveOutReceiptRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/sensor-dormitory', senserDormitoryRoutes); 
app.use('/api/influx', influxRoutes); 

// Debug route
app.get('/debug', (req, res) => {
  res.json({ message: 'Debug route works!' });
});

app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend is running at http://localhost:${PORT}`);
});
