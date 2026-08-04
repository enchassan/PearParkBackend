// Fix for Windows DNS EREFUSED on MongoDB Atlas SRV lookup
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const authRoutes = require('./routes/authRoutes');
const spotRoutes = require('./routes/spotRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('🚀 MongoDB Cluster linked successfully.'))
  .catch((err) => console.error('❌ Database link failed:', err.message));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'online', message: 'PeerPark API Gateway running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/spots', spotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`📡 Backend active on port ${PORT}`));