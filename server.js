const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Cloud database gateway mapping
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('🚀 MongoDB Cluster linked successfully.'))
  .catch((err) => console.error('❌ Database link failed:', err.message));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'online', message: 'PeerPark API Gateway running.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`📡 Backend active on port ${PORT}`));