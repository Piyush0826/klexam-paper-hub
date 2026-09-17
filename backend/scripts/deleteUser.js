require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');

const s = new Sequelize(process.env.MYSQL_DATABASE, process.env.MYSQL_USER, process.env.MYSQL_PASSWORD, {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT || 3306,
  dialect: 'mysql',
  logging: false,
});

s.query("DELETE FROM users WHERE email = '2300031887@kluniversity.in'")
  .then(([, meta]) => {
    console.log('✅ Rows deleted:', meta.affectedRows);
    s.close();
  })
  .catch(e => {
    console.error('❌ Error:', e.message);
    s.close();
  });
