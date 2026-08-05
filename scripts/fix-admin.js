import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const email = 'admin@peerpark.com';
const password = 'Admin@123';

try {
  await mongoose.connect(process.env.MONGO_URI);

  const password_hash = await bcrypt.hash(password, 10);
  const result = await mongoose.connection.db.collection('users').updateOne(
    { email },
    { $set: { password_hash, role: 'SuperAdmin' } },
    { upsert: true }
  );

  console.log('Admin password reset result:', result);
  await mongoose.disconnect();
} catch (error) {
  console.error('Failed to reset admin password:', error.message);
  process.exit(1);
}
