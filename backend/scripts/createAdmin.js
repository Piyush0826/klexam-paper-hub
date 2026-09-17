// backend/scripts/createAdmin.js
// One‑time script to seed an admin user securely.
// Run with: `node backend/scripts/createAdmin.js`

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { User } = require('../src/models'); // Adjust path if needed
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = 'piyushvkb0826@gmail.com';

async function main() {
  const plainPassword = process.env.ADMIN_PASSWORD;
  if (!plainPassword) {
    console.error('❌ ADMIN_PASSWORD not set in environment.');
    process.exit(1);
  }

  // Check if admin already exists
  const existing = await User.findOne({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log('⚠️ Admin user already exists. No action taken.');
    process.exit(0);
  }

  const hashed = await bcrypt.hash(plainPassword, 10);

  await User.create({
    name: 'Admin',
    collegeId: process.env.ADMIN_COLLEGE_ID || 'ADMIN-001',
    email: ADMIN_EMAIL,
    role: 'admin',
    password: hashed,
    isEmailVerified: true,
    isBlocked: false,
  });

  console.log('✅ Admin user created successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error creating admin:', err);
  process.exit(1);
});
