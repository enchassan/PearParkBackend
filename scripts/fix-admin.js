import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const email = (process.env.ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL || '').toLowerCase();
const password = process.env.ADMIN_PASSWORD || process.env.DEFAULT_ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Missing admin credentials in environment variables. Expected ADMIN_EMAIL/ADMIN_PASSWORD or DEFAULT_ADMIN_EMAIL/DEFAULT_ADMIN_PASSWORD.');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);

  const password_hash = await bcrypt.hash(password, 10);
  const result = await mongoose.connection.db.collection('users').updateOne(
    { email },
    { $set: { password_hash, role: 'SuperAdmin' } },
    { upsert: true }
  );

  console.log('Admin user updated successfully:', result);
  await mongoose.disconnect();
} catch (error) {
  console.error('Failed to reset admin password:', error.message);
  process.exit(1);
}