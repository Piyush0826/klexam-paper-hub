const allowedRoles = ['student', 'faculty']

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isCollegeEmail(email) {
  const configuredDomain = (process.env.COLLEGE_EMAIL_DOMAIN || '@kluniversity.in').trim().toLowerCase()
  const atIndex = email.indexOf('@')
  return atIndex > 0 && email.indexOf('@', atIndex + 1) === -1 && email.endsWith(configuredDomain)
}

function validateRegistrationInput(input = {}) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const collegeId = typeof input.collegeId === 'string' ? input.collegeId.trim() : ''
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  const role = typeof input.role === 'string' && input.role.trim() ? input.role.trim().toLowerCase() : 'student'
  const errors = []

  if (name.length < 2) errors.push('Name must be at least 2 characters long')
  if (!collegeId) errors.push('College ID is required')
  if (!email) errors.push('Email is required')
  else if (!isValidEmail(email)) errors.push('Please enter a valid email address')
  else if (!isCollegeEmail(email)) errors.push('Only KL University email addresses are allowed')
  if (password.length < 8) errors.push('Password must be at least 8 characters long')
  if (!allowedRoles.includes(role)) errors.push('Role must be student or faculty')

  return { errors, values: { name, collegeId, email, password, role } }
}

module.exports = { allowedRoles, isCollegeEmail, isValidEmail, validateRegistrationInput }