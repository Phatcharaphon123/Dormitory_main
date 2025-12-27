//Step 1 import 
const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
const {readdirSync} = require('fs');
const port = 3001;

// Middleware 
app.use(morgan('dev'));
app.use(express.json());
app.use(cors())

// เพื่อให้ดูรูปที่อัปโหลดได้
app.use('/uploads', express.static('uploads'));

// step to dynamically load routes
readdirSync('./routes')
    .filter((file) => file.endsWith('.js')) //กรองเฉพาะไฟล์ .js
    .map((c) => app.use('/api', require('./routes/' + c)))

// Step 2 Start server
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));

