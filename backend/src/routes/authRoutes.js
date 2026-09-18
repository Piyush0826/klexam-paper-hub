const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const { getCurrentUser, loginUser, registerUser, resendOtp, verifyEmail, requestPasswordReset, resetPassword, seedAdmin } = require('../controllers/authController')

const router = express.Router()

router.all('/seed-admin', seedAdmin)
router.post('/register', registerUser)
router.post('/verify-email', verifyEmail)
router.post('/resend-otp', resendOtp)
router.post('/login', loginUser)
router.post('/forgot-password', requestPasswordReset)
router.post('/reset-password', resetPassword)
router.get('/me', authMiddleware, getCurrentUser)

module.exports = router