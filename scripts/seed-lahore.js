import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Spot from '../models/Spot.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI missing from .env');
  process.exit(1);
}

const seedDatabase = async () => {
  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    // 1. Password hash for all seeded demo users (Password: Password@123)
    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

    // 2. Clear old seeded demo records (preserve SuperAdmin)
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await Spot.deleteMany({});
    await User.deleteMany({ role: { $in: ['Driver', 'Host'] } });
    console.log('🧹 Cleared previous demo records.');

    // 3. Seed Users
    const hostAli = await User.create({
      full_name: 'Ali Raza',
      email: 'host.ali@peerpark.com',
      password_hash: defaultPasswordHash,
      phone_number: '+923001234567',
      role: 'Host',
      is_profile_verified: true,
      cnic_matrix: {
        cnic_number: '35202-1456789-1',
        cnic_front_url: 'https://res.cloudinary.com/demo/image/upload/sample_cnic_front.jpg',
        cnic_back_url: 'https://res.cloudinary.com/demo/image/upload/sample_cnic_back.jpg',
      },
    });

    const hostZainab = await User.create({
      full_name: 'Zainab Tariq',
      email: 'host.zainab@peerpark.com',
      password_hash: defaultPasswordHash,
      phone_number: '+923219876543',
      role: 'Host',
      is_profile_verified: false, // <-- Appears in Admin Verifications queue
      cnic_matrix: {
        cnic_number: '35201-9876543-2',
        cnic_front_url: 'https://res.cloudinary.com/demo/image/upload/sample_cnic_front.jpg',
        cnic_back_url: 'https://res.cloudinary.com/demo/image/upload/sample_cnic_back.jpg',
      },
    });

    const driverHassan = await User.create({
      full_name: 'Hassan Mirza',
      email: 'driver.hassan@peerpark.com',
      password_hash: defaultPasswordHash,
      phone_number: '+923334567890',
      role: 'Driver',
      is_profile_verified: true,
    });

    const driverBilal = await User.create({
      full_name: 'Bilal Ahmed',
      email: 'driver.bilal@peerpark.com',
      password_hash: defaultPasswordHash,
      phone_number: '+923057654321',
      role: 'Driver',
      is_profile_verified: true,
    });

    console.log('👥 Demo Hosts and Drivers seeded.');

    // 4. Seed Lahore Spots (GeoJSON standard: [longitude, latitude])
    const spotsData = [
      {
        host_id: hostAli._id,
        street_address: '14B Sunset Blvd, DHA Phase 5, Lahore',
        hourly_rate: 150,
        is_active: true,
        spot_status: 'Approved',
        location: { type: 'Point', coordinates: [74.3985, 31.4725] },
      },
      {
        host_id: hostAli._id,
        street_address: 'Tech Park Block C, Main Blvd, Gulberg III, Lahore',
        hourly_rate: 200,
        is_active: true,
        spot_status: 'Approved',
        location: { type: 'Point', coordinates: [74.354, 31.512] },
      },
      {
        host_id: hostAli._id,
        street_address: 'Plot 42, Sector G2, Johar Town, Lahore',
        hourly_rate: 120,
        is_active: true,
        spot_status: 'Approved',
        location: { type: 'Point', coordinates: [74.269, 31.468] },
      },
      {
        host_id: hostZainab._id,
        street_address: 'Plaza Driveway, Mall Road, Lahore',
        hourly_rate: 180,
        is_active: true,
        spot_status: 'Approved',
        location: { type: 'Point', coordinates: [74.316, 31.558] },
      },
      {
        host_id: hostZainab._id,
        street_address: 'Central Commercial Area, Model Town, Lahore',
        hourly_rate: 140,
        is_active: true,
        spot_status: 'Approved',
        location: { type: 'Point', coordinates: [74.321, 31.488] },
      },
      {
        host_id: hostAli._id,
        street_address: 'Civic Centre Commercial Hub, Bahria Town, Lahore',
        hourly_rate: 100,
        is_active: true,
        spot_status: 'Approved',
        location: { type: 'Point', coordinates: [74.185, 31.365] },
      },
    ];

    const spots = await Spot.insertMany(spotsData);
    console.log(`📍 ${spots.length} Lahore parking spots seeded.`);

    // 5. Seed Bookings & Payments
    const now = new Date();

    // Booking 1: Completed session in DHA Phase 5 (3 hours @ Rs. 150 = Rs. 450)
    const checkin1 = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const checkout1 = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const booking1 = await Booking.create({
      spot_id: spots[0]._id,
      driver_id: driverHassan._id,
      host_id: hostAli._id,
      scheduled_checkin: checkin1,
      scheduled_checkout: checkout1,
      actual_checkin: checkin1,
      actual_checkout: checkout1,
      total_fee: 450,
      booking_status: 'Completed',
    });

    await Payment.create({
      booking_id: booking1._id,
      gateway_provider: 'JazzCash',
      transaction_id: `JC-${Date.now().toString().slice(-6)}`,
      amount_pkr: 450,
      escrow_status: 'Settled',
    });

    // Booking 2: Completed session in Gulberg III (2 hours @ Rs. 200 = Rs. 400)
    const checkin2 = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const checkout2 = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const booking2 = await Booking.create({
      spot_id: spots[1]._id,
      driver_id: driverBilal._id,
      host_id: hostAli._id,
      scheduled_checkin: checkin2,
      scheduled_checkout: checkout2,
      actual_checkin: checkin2,
      actual_checkout: checkout2,
      total_fee: 400,
      booking_status: 'Completed',
    });

    await Payment.create({
      booking_id: booking2._id,
      gateway_provider: 'EasyPaisa',
      transaction_id: `EP-${Date.now().toString().slice(-6)}`,
      amount_pkr: 400,
      escrow_status: 'Settled',
    });

    // Booking 3: Ongoing Active Parking in Johar Town
    const checkin3 = new Date(now.getTime() - 45 * 60 * 1000); // 45 mins ago
    const checkout3 = new Date(now.getTime() + 75 * 60 * 1000);
    await Booking.create({
      spot_id: spots[2]._id,
      driver_id: driverHassan._id,
      host_id: hostAli._id,
      scheduled_checkin: checkin3,
      scheduled_checkout: checkout3,
      actual_checkin: checkin3,
      total_fee: 240,
      booking_status: 'Active_Parking',
    });

    // Booking 4: Pending request awaiting approval in Mall Road
    const checkin4 = new Date(now.getTime() + 30 * 60 * 1000);
    const checkout4 = new Date(now.getTime() + 150 * 60 * 1000);
    await Booking.create({
      spot_id: spots[3]._id,
      driver_id: driverBilal._id,
      host_id: hostZainab._id,
      scheduled_checkin: checkin4,
      scheduled_checkout: checkout4,
      total_fee: 360,
      booking_status: 'Pending',
    });

    console.log('💳 Bookings and settled escrow payments seeded.');
    console.log('\n=============================================');
    console.log('🎉 LAHORE ECOSYSTEM SEEDED SUCCESSFULLY!');
    console.log('=============================================');
    console.log('🔑 Login Credentials (Password for all: Password@123):');
    console.log('   • Host (Verified):   host.ali@peerpark.com');
    console.log('   • Host (Unverified): host.zainab@peerpark.com (Check Admin Verifications)');
    console.log('   • Driver 1:          driver.hassan@peerpark.com (Has Active & Past bookings)');
    console.log('   • Driver 2:          driver.bilal@peerpark.com (Has Pending booking)');
    console.log('=============================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();