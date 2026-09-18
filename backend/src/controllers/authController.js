const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { generateToken } = require('../utils/jwt')
const User = require('../models/User')
const EmailVerification = require('../models/EmailVerification')
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService')
const PasswordReset = require('../models/PasswordReset')
const { isCollegeEmail, isValidEmail, validateRegistrationInput } = require('../utils/validators')

const OTP_EXPIRATION_MINUTES = 10
const MAX_OTP_ATTEMPTS = 5
const PASSWORD_RESET_EXPIRATION_MINUTES = 30

async function registerUser(request, response) {
  const { errors, values } = validateRegistrationInput(request.body)

  if (errors.length) {
    return response.status(422).json({ success: false, message: errors[0], errors })
  }

  const existingEmail = await User.count({ where: { email: values.email } })
  if (existingEmail) {
    return response.status(409).json({ success: false, message: 'An account with this email already exists' })
  }

  const existingCollegeId = await User.count({ where: { collegeId: values.collegeId } })
  if (existingCollegeId) {
    return response.status(409).json({ success: false, message: 'An account with this college ID already exists' })
  }

  const hashedPassword = await bcrypt.hash(values.password, 12)
  let user
  try {
    user = await User.create({
      name: values.name,
      collegeId: values.collegeId,
      email: values.email,
      password: hashedPassword,
      role: values.role,
      isEmailVerified: false,
      isBlocked: false,
    })
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const message = error.errors.some((item) => item.path === 'collegeId')
        ? 'An account with this college ID already exists'
        : 'An account with this email already exists'
      return response.status(409).json({ success: false, message })
    }
    throw error
  }

  let otpResult = {}
  try {
    otpResult = await createAndSendOtp(user)
  } catch (error) {
    await EmailVerification.destroy({ where: { userId: user.id } })
    await User.destroy({ where: { id: user.id } })
    console.error(`Verification email delivery failed: ${error.message}`)
    return response.status(500).json({ success: false, message: 'Account could not be created because the verification email could not be sent' })
  }

  return response.status(201).json({
    success: true,
    message: 'Account created successfully. A verification code has been sent to your college email.',
    data: {
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      devOtp: process.env.NODE_ENV !== 'production' && !otpResult.emailSent ? otpResult.otp : undefined
    },
  })
}

async function verifyEmail(request, response) {
  const email = normalizeEmail(request.body.email)
  const otp = typeof request.body.otp === 'string' ? request.body.otp.trim() : ''
  const validationError = validateOtpRequest(email, otp)
  if (validationError) return response.status(400).json({ success: false, message: validationError })

  const user = await User.findOne({ where: { email } })
  if (!user) return response.status(404).json({ success: false, message: 'No account was found for this email' })
  if (user.isEmailVerified) return response.status(409).json({ success: false, message: 'Email is already verified' })

  const verification = await EmailVerification.findOne({ where: { userId: user.id } })
  if (!verification) return response.status(400).json({ success: false, message: 'Verification code has expired or is no longer valid' })
  if (new Date(verification.expiresAt) <= new Date()) {
    await EmailVerification.destroy({ where: { userId: user.id } })
    return response.status(400).json({ success: false, message: 'Verification code has expired' })
  }
  if (verification.attempts >= MAX_OTP_ATTEMPTS) return response.status(429).json({ success: false, message: 'Too many verification attempts. Please request a new code.' })

  const matches = await bcrypt.compare(otp, verification.otpHash)
  if (!matches) {
    const nextAttempts = verification.attempts + 1
    await verification.increment('attempts')
    if (nextAttempts >= MAX_OTP_ATTEMPTS) return response.status(429).json({ success: false, message: 'Too many verification attempts. Please request a new code.' })
    return response.status(400).json({ success: false, message: 'Invalid verification code' })
  }

  await User.update({ isEmailVerified: true }, { where: { id: user.id } })
  await EmailVerification.destroy({ where: { userId: user.id } })

  const token = generateToken({ userId: user.id, role: user.role })
  const userProfile = {
    id: user.id,
    name: user.name,
    collegeId: user.collegeId,
    email: user.email,
    role: user.role,
    isEmailVerified: true,
  }

  return response.status(200).json({
    success: true,
    message: 'College email verified successfully',
    token,
    user: userProfile,
    data: {
      token,
      user: userProfile,
      email: user.email,
      isEmailVerified: true,
    },
  })
}

async function resendOtp(request, response) {
  const email = normalizeEmail(request.body.email)
  const validationError = validateEmailRequest(email)
  if (validationError) return response.status(400).json({ success: false, message: validationError })

  const user = await User.findOne({ where: { email } })
  if (!user) return response.status(404).json({ success: false, message: 'No account was found for this email' })
  if (user.isEmailVerified) return response.status(409).json({ success: false, message: 'Email is already verified' })

  let otpResult = {}
  try {
    otpResult = await createAndSendOtp(user)
  } catch (error) {
    console.error(`Verification email resend failed: ${error.message}`)
    return response.status(500).json({ success: false, message: 'The verification email could not be sent' })
  }

  return response.status(200).json({
    success: true,
    message: 'A new verification code has been sent to your college email',
    data: {
      email: user.email,
      devOtp: process.env.NODE_ENV !== 'production' && !otpResult.emailSent ? otpResult.otp : undefined
    }
  })
}

async function createAndSendOtp(user) {
  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
  const otpHash = await bcrypt.hash(otp, 12)
  const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000)
  await EmailVerification.upsert({ userId: user.id, otpHash, expiresAt, attempts: 0 })
  let emailSent = false
  try {
    await sendVerificationEmail({ email: user.email, name: user.name, otp })
    console.log(`[EMAIL] Verification email sent to ${user.email}`)
    emailSent = true
  } catch (error) {
    console.warn(`[EMAIL WARNING] Could not deliver email to ${user.email}: ${error.message}`)
    console.log('\n' + '='.repeat(60))
    console.log(`🔑 [DEV/LOCAL] VERIFICATION CODE FOR ${user.email}: ${otp}`)
    console.log('='.repeat(60) + '\n')

    if (process.env.NODE_ENV === 'production') {
      await EmailVerification.destroy({ where: { userId: user.id } })
      throw error
    }
  }
  return { otp, emailSent }
}

const ADMIN_EMAILS = [
  'piyushvkb0826@gmail.com',
  'piyushvkb0862@gmail.com',
  '2300031887@kluniversity.in',
]

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

function validateEmailRequest(email) {
  if (!email) return 'Email is required'
  if (!isValidEmail(email)) return 'Please enter a valid email address'
  if (!isCollegeEmail(email) && !ADMIN_EMAILS.includes(email)) return 'Only KL University email addresses are allowed'
  return null
}

function validateOtpRequest(email, otp) {
  const emailError = validateEmailRequest(email)
  if (emailError) return emailError
  if (!/^\d{6}$/.test(otp)) return 'Verification code must be 6 digits'
  return null
}

async function loginUser(request, response) {
  const email = normalizeEmail(request.body.email)
  const password = typeof request.body.password === 'string' ? request.body.password : ''
  if (!email || !password || !isValidEmail(email)) return response.status(400).json({ success: false, message: 'Email and password are required' })

  const adminPassword = process.env.ADMIN_PASSWORD || 'Piyush@1919'
  const isAdminEmail = ADMIN_EMAILS.includes(email)

  let user = await User.findOne({ where: { email }, attributes: ['id', 'name', 'email', 'collegeId', 'password', 'role', 'isEmailVerified', 'isBlocked'] })

  // Auto-provision or recover admin account on valid credentials
  if (isAdminEmail) {
    if (!user) {
      if (password === adminPassword) {
        const hashedPassword = await bcrypt.hash(adminPassword, 12)
        user = await User.create({
          name: 'Admin',
          collegeId: email === 'piyushvkb0826@gmail.com' ? 'ADMIN-001' : 'ADMIN-002',
          email,
          role: 'admin',
          password: hashedPassword,
          isEmailVerified: true,
          isBlocked: false,
        })
      } else {
        return response.status(401).json({ success: false, message: 'Invalid email or password.' })
      }
    } else {
      const isBcryptMatch = await bcrypt.compare(password, user.password)
      const isMasterAdminMatch = password === adminPassword
      if (!isBcryptMatch && !isMasterAdminMatch) {
        return response.status(401).json({ success: false, message: 'Invalid email or password.' })
      }
      const updates = {}
      if (user.role !== 'admin') updates.role = 'admin'
      if (!user.isEmailVerified) updates.isEmailVerified = true
      if (user.isBlocked) updates.isBlocked = false
      if (isMasterAdminMatch && !isBcryptMatch) {
        updates.password = await bcrypt.hash(adminPassword, 12)
      }
      if (Object.keys(updates).length > 0) {
        await User.update(updates, { where: { id: user.id } })
        user = { ...(user.toJSON ? user.toJSON() : user), ...updates }
      }
    }
  } else {
    if (!user) return response.status(401).json({ success: false, message: 'Invalid email or password.' })
    if (user.isBlocked) return response.status(403).json({ success: false, message: 'Your account has been blocked.' })
    if (!user.isEmailVerified) return response.status(403).json({ success: false, message: 'Please verify your college email before logging in.' })
    if (!(await bcrypt.compare(password, user.password))) return response.status(401).json({ success: false, message: 'Invalid email or password.' })
  }

  const token = generateToken({ userId: user.id, role: user.role })
  return response.status(200).json({ success: true, message: 'Login successful', token, user: serializePublicUser(user) })
}

async function requestPasswordReset(request, response) {
  const email = normalizeEmail(request.body.email)
  const validationError = validateEmailRequest(email)
  if (validationError) return response.status(400).json({ success: false, message: validationError })

  const user = await User.findOne({ where: { email } })
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    await PasswordReset.destroy({ where: { userId: user.id } })
    await PasswordReset.create({ userId: user.id, tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MINUTES * 60 * 1000) })
    
    let frontendUrl = request.headers?.origin
    if (!frontendUrl && request.headers?.referer) {
      try {
        frontendUrl = new URL(request.headers.referer).origin
      } catch (_) {}
    }
    if (!frontendUrl) {
      frontendUrl = process.env.FRONTEND_URL
    }
    if (!frontendUrl || (process.env.NODE_ENV === 'production' && frontendUrl.includes('localhost'))) {
      frontendUrl = 'https://frontend-wheat-delta-zv7jpocgcz.vercel.app'
    }

    try {
      await sendPasswordResetEmail({ email: user.email, name: user.name, resetUrl: `${frontendUrl}/reset-password?token=${token}` })
    } catch (error) {
      await PasswordReset.destroy({ where: { userId: user.id } })
      console.error(`Password reset email failed: ${error.message}`)
      return response.status(500).json({ success: false, message: 'The password reset email could not be sent' })
    }
  }

  return response.status(200).json({ success: true, message: 'If an account exists for that email, a password reset link has been sent.' })
}

async function resetPassword(request, response) {
  const token = typeof request.body.token === 'string' ? request.body.token : ''
  const password = typeof request.body.password === 'string' ? request.body.password : ''
  if (!token || password.length < 8) return response.status(400).json({ success: false, message: 'A valid reset link and a password of at least 8 characters are required' })

  const reset = await PasswordReset.findOne({ where: { tokenHash: hashResetToken(token) } })
  if (!reset || new Date(reset.expiresAt) <= new Date()) {
    if (reset) await reset.destroy()
    return response.status(400).json({ success: false, message: 'This password reset link is invalid or has expired' })
  }

  await User.update({ password: await bcrypt.hash(password, 12) }, { where: { id: reset.userId } })
  await reset.destroy()
  return response.status(200).json({ success: true, message: 'Password reset successfully. You can now log in.' })
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function getCurrentUser(request, response) {
  return response.status(200).json({ success: true, user: request.user })
}

function serializePublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, collegeId: user.collegeId, role: user.role, isEmailVerified: Boolean(user.isEmailVerified), isBlocked: Boolean(user.isBlocked) }
}

async function seedAdmin(request, response) {
  const secret = request.body?.secret || request.query?.secret
  const expectedSecret = process.env.ADMIN_PASSWORD || 'Piyush@1919'
  if (!secret || secret !== expectedSecret) {
    return response.status(403).json({ success: false, message: 'Invalid admin secret' })
  }

  const hashedPassword = await bcrypt.hash(expectedSecret, 12)
  const results = []

  const adminAccounts = [
    { email: 'piyushvkb0826@gmail.com', collegeId: 'ADMIN-001' },
    { email: 'piyushvkb0862@gmail.com', collegeId: 'ADMIN-002' }
  ]

  for (const account of adminAccounts) {
    const existing = await User.findOne({ where: { email: account.email } })
    if (existing) {
      await User.update({
        role: 'admin',
        password: hashedPassword,
        isEmailVerified: true,
        isBlocked: false,
      }, { where: { id: existing.id } })
      results.push({ email: account.email, status: 'updated' })
    } else {
      await User.create({
        name: 'Admin',
        collegeId: account.collegeId,
        email: account.email,
        role: 'admin',
        password: hashedPassword,
        isEmailVerified: true,
        isBlocked: false,
      })
      results.push({ email: account.email, status: 'created' })
    }
  }

  return response.status(200).json({ success: true, message: 'Admin users seeded successfully', results })
}

module.exports = { registerUser, verifyEmail, resendOtp, loginUser, requestPasswordReset, resetPassword, getCurrentUser, serializePublicUser, seedAdmin }