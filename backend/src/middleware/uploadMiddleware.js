const multer = require('multer')
const path = require('path')

const allowedTypes = new Map([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'image'],
  ['image/jpg', 'image'],
  ['image/pjpeg', 'image'],
  ['image/png', 'image'],
  ['image/webp', 'image'],
])
const maxFileSize = 10 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: 10 },
  fileFilter: (request, file, callback) => {
    let fileType = allowedTypes.get(file.mimetype)
    const extension = path.extname(file.originalname).toLowerCase()

    // Resilient fallback for mobile cameras reporting generic MIME types
    if (!fileType) {
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
        fileType = 'image'
      } else if (extension === '.pdf') {
        fileType = 'pdf'
      }
    }

    const validExtension = fileType === 'pdf'
      ? extension === '.pdf'
      : ['.jpg', '.jpeg', '.png', '.webp'].includes(extension)

    if (!fileType || !validExtension) {
      const error = new Error('Only PDF, JPG, JPEG, PNG, and WebP files are allowed')
      error.statusCode = 400
      return callback(error)
    }
    return callback(null, true)
  },
})

module.exports = { upload, allowedTypes, maxFileSize }
