const jwt = require('jsonwebtoken')

function getJwtConfig() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured')
  return { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
}

function generateToken(payload) {
  const { secret, expiresIn } = getJwtConfig()
  return jwt.sign(payload, secret, { expiresIn })
}

function verifyToken(token) {
  const { secret } = getJwtConfig()
  return jwt.verify(token, secret)
}

module.exports = { generateToken, verifyToken }
