const express = require('express');
const cors = require('cors');
const dormRoutes = require('./routes/dormRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/dorm', dormRoutes);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend is running at http://localhost:${PORT}`);
});
