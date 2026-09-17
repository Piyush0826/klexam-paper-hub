function errorHandler(error, request, response, next) {
  if (error.code === 'LIMIT_FILE_SIZE') return response.status(400).json({ success: false, message: 'Each paper file must be 10 MB or smaller' })
  if (error.code === 'LIMIT_UNEXPECTED_FILE') return response.status(400).json({ success: false, message: 'Too many paper files were submitted' })
  const statusCode = error.statusCode || 500
  const message = statusCode === 500 ? 'Internal server error' : error.message

  if (statusCode === 500) {
    console.error(`Unhandled request error: ${error.message}`)
  }

  response.status(statusCode).json({ success: false, message })
}

module.exports = errorHandler