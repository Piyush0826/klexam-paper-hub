const { v2: cloudinary } = require('cloudinary')

function configureCloudinary() {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config()
    return cloudinary
  }

  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
  const missing = required.filter((key) => !process.env[key])
  if (missing.length) throw new Error('Cloudinary is not configured')

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  return cloudinary
}

module.exports = { configureCloudinary }
