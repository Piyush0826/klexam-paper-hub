// backend/scripts/createAdmin.js
// One‑time script to seed an admin user securely.
// Run with: `node backend/scripts/createAdmin.js`

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { User } = require('../src/models'); // Adjust path if needed
const bcrypt = require('bcryptjs');

const ADMIN_ACCOUNTS = [
  { email: 'piyushvkb0826@gmail.com', collegeId: 'ADMIN-001' },
  { email: 'piyushvkb0862@gmail.com', collegeId: 'ADMIN-002' }
];

async function main() {
  const plainPassword = process.env.ADMIN_PASSWORD;
  if (!plainPassword) {
    console.error('❌ ADMIN_PASSWORD not set in environment.');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(plainPassword, 10);

  for (const account of ADMIN_ACCOUNTS) {
    const existing = await User.findOne({ where: { email: account.email } });
    if (existing) {
      await User.update({
        role: 'admin',
        password: hashed,
        isEmailVerified: true,
        isBlocked: false,
      }, { where: { id: existing.id } });
      console.log(`✅ Admin user updated: ${account.email}`);
    } else {
      await User.create({
        name: 'Admin',
        collegeId: account.collegeId,
        email: account.email,
        role: 'admin',
        password: hashed,
        isEmailVerified: true,
        isBlocked: false,
      });
      console.log(`✅ Admin user created: ${account.email}`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error creating admin:', err);
  process.exit(1);
});
