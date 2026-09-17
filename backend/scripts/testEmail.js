require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');

async function main() {
  console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_SECURE:', process.env.EMAIL_SECURE);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send a test email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'piyushvkb0826@gmail.com',
      subject: 'KLExamPrep SMTP Test',
      text: 'SMTP is working correctly. Your verification code is: 123456',
    });
    console.log('✅ Test email sent to piyushvkb0826@gmail.com');
  } catch (err) {
    console.error('❌ SMTP Error:', err.message);
    console.error('Error code:', err.code);
    console.error('Response:', err.response);
  }
}

main();
