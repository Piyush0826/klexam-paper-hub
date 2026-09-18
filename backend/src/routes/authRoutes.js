const express = require('express')
const rateLimit = require('express-rate-limit')
const authMiddleware = require('../middleware/authMiddleware')
const { getCurrentUser, loginUser, registerUser, resendOtp, verifyEmail, requestPasswordReset, resetPassword, seedAdmin } = require('../controllers/authController')

const router = express.Router()

router.all('/seed-admin', seedAdmin)
router.post('/register', registerUser)
router.post('/verify-email', verifyEmail)
router.post('/resend-otp', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many verification requests. Please try again later.' } }), resendOtp)
router.post('/login', loginUser)
router.post('/forgot-password', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many password reset requests. Please try again later.' } }), requestPasswordReset)
router.post('/reset-password', resetPassword)
router.get('/me', authMiddleware, getCurrentUser)

module.exports = router