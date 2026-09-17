const nodemailer = require('nodemailer')

function createTransporter() {
  const port = Number(process.env.EMAIL_PORT)
  if (!process.env.EMAIL_HOST || !port || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Email service is not configured')
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: process.env.EMAIL_SECURE === 'true' || port === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD.replace(/\s+/g, '') },
  })
}

async function sendVerificationEmail({ email, name, otp }) {
  const transporter = createTransporter()
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'KLExamPrep College Email Verification',
    text: `Hello ${name},\n\nYour KLExamPrep verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this verification, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>KLExamPrep</h2><p>Hello ${escapeHtml(name)},</p><p>Your KLExamPrep verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>This code will expire in 10 minutes.</p><p>If you did not request this verification, you can ignore this email.</p></div>`,
  })
}

async function sendPasswordResetEmail({ email, name, resetUrl }) {
  const transporter = createTransporter()
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'KLExamPrep Password Reset',
    text: `Hello ${name},\n\nReset your KLExamPrep password using this link:\n${resetUrl}\n\nThis link will expire in 30 minutes. If you did not request this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>KLExamPrep</h2><p>Hello ${escapeHtml(name)},</p><p>Use the link below to reset your password. It will expire in 30 minutes.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
  })
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail }