// backend/scripts/fixUsers.js
// Script to:
// 1. Delete piyushvkb0862@gmail.com admin account
// 2. Ensure piyushvkb0826@gmail.com remains admin
// 3. Downgrade Piyush Pandey (2300031887@kluniversity.in) to student

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');

const s = new Sequelize(process.env.MYSQL_DATABASE, process.env.MYSQL_USER, process.env.MYSQL_PASSWORD, {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT || 3306,
  dialect: 'mysql',
  logging: false,
});

async function main() {
  // 1. Delete the piyushvkb0862@gmail.com admin account
  const [, deleteMeta] = await s.query(
    "DELETE FROM users WHERE email = 'piyushvkb0862@gmail.com'"
  );
  console.log(`✅ Deleted piyushvkb0862@gmail.com — rows affected: ${deleteMeta.affectedRows}`);

  // 2. Make sure piyushvkb0826@gmail.com is admin (just in case)
  const [, adminMeta] = await s.query(
    "UPDATE users SET role = 'admin' WHERE email = 'piyushvkb0826@gmail.com'"
  );
  console.log(`✅ Ensured piyushvkb0826@gmail.com is admin — rows affected: ${adminMeta.affectedRows}`);

  // 3. Downgrade 2300031887@kluniversity.in to student
  const [, studentMeta] = await s.query(
    "UPDATE users SET role = 'student' WHERE email = '2300031887@kluniversity.in'"
  );
  console.log(`✅ Downgraded 2300031887@kluniversity.in to student — rows affected: ${studentMeta.affectedRows}`);

  await s.close();
  console.log('\n✅ All done!');
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  s.close();
  process.exit(1);
});
