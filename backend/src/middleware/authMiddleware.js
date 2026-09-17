const User = require('../models/User')
const { verifyToken } = require('../utils/jwt')

async function authMiddleware(request, response, next) {
  const authorization = request.get('Authorization')
  if (!authorization || !authorization.startsWith('Bearer ')) return response.status(401).json({ success: false, message: 'Authentication required.' })

  const token = authorization.slice(7).trim()
  if (!token) return response.status(401).json({ success: false, message: 'Authentication required.' })

  try {
    const payload = verifyToken(token)
    if (!payload.userId) return response.status(401).json({ success: false, message: 'Authentication required.' })
    const user = await User.findByPk(payload.userId, { attributes: ['id', 'name', 'email', 'collegeId', 'role', 'isEmailVerified', 'isBlocked'] })
    if (!user) return response.status(401).json({ success: false, message: 'Authentication required.' })
    if (user.isBlocked) return response.status(403).json({ success: false, message: 'Your account has been blocked.' })
    if (!user.isEmailVerified) return response.status(403).json({ success: false, message: 'Please verify your college email before accessing this resource.' })

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      collegeId: user.collegeId,
      role: user.role,
      isEmailVerified: Boolean(user.isEmailVerified),
      isBlocked: Boolean(user.isBlocked),
    }
    return next()
  } catch (error) {
    if (error.message === 'JWT_SECRET is not configured') return next(error)
    return response.status(401).json({ success: false, message: 'Authentication required.' })
  }
}

module.exports = authMiddleware
