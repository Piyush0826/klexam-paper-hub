const User = require('../models/User')

async function adminMiddleware(request, response, next) {
  try {
    const currentUser = await User.findByPk(request.user.id, { attributes: ['id', 'role', 'isBlocked', 'isEmailVerified'] })
    if (!currentUser) return response.status(401).json({ success: false, message: 'Authentication required.' })
    if (currentUser.isBlocked) return response.status(403).json({ success: false, message: 'Your account has been blocked.' })
    if (currentUser.role !== 'admin') return response.status(403).json({ success: false, message: 'Admin access required.' })

    request.adminUser = currentUser
    return next()
  } catch (error) {
    return next(error)
  }
}

module.exports = adminMiddleware
