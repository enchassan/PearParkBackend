// Fix for Windows DNS EREFUSED on MongoDB Atlas SRV lookup
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

import authRoutes from './routes/authRoutes.js';
import spotRoutes from './routes/spotRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import User from './models/User.js';

dotenv.config();

const app = express();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL || 'admin@peerpark.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123';
const ADMIN_NAME = process.env.ADMIN_NAME || process.env.DEFAULT_ADMIN_NAME || 'Admin Hassan';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const seedDefaultAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

    if (!existingAdmin) {
      const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

      await User.create({
        full_name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password_hash,
        phone_number: '+923000000000',
        role: 'SuperAdmin',
      });

      console.log(`🛡️ Default admin created for ${ADMIN_EMAIL}`);
      return;
    }

    const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await User.findByIdAndUpdate(existingAdmin._id, {
      full_name: existingAdmin.full_name || ADMIN_NAME,
      role: 'SuperAdmin',
      phone_number: existingAdmin.phone_number || '+923000000000',
      password_hash,
    });

    console.log(`🔐 Admin account ensured for ${ADMIN_EMAIL}`);
  } catch (error) {
    console.error('❌ Failed to seed admin account:', error.message);
  }
};

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('🚀 MongoDB Cluster linked successfully.');
    await seedDefaultAdmin();
  })
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