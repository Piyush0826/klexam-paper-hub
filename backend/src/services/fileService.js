const fs = require('fs')
const path = require('path')
const { configureCloudinary } = require('../config/cloudinary')

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
     process.env.CLOUDINARY_API_KEY &&
     process.env.CLOUDINARY_API_SECRET)
  )
}

async function uploadToLocal(file, userId) {
  const uploadDir = path.join(__dirname, '../../uploads/papers', String(userId))
  await fs.promises.mkdir(uploadDir, { recursive: true })

  const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizedName}`
  const filePath = path.join(uploadDir, filename)

  await fs.promises.writeFile(filePath, file.buffer)
  const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image'

  return {
    url: `/uploads/papers/${userId}/${filename}`,
    publicId: `local:${userId}/${filename}`,
    resourceType,
  }
}

async function uploadBuffer(file, folder, userId) {
  if (isCloudinaryConfigured()) {
    try {
      const cloudinary = configureCloudinary()
      const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image'

      return await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: resourceType, folder }, (error, result) => {
          if (error) return reject(error)
          return resolve({ url: result.secure_url, publicId: result.public_id, resourceType })
        })
        stream.end(file.buffer)
      })
    } catch (error) {
      console.warn(`Cloudinary upload failed: ${error.message}. Falling back to local storage.`)
    }
  }

  return uploadToLocal(file, userId)
}

async function uploadPaperFiles(files, userId) {
  const uploaded = []
  try {
    const results = await Promise.all(
      files.map(async (file, index) => {
        const result = await uploadBuffer(file, `klexamprep/papers/${userId}`, userId)
        const item = {
          ...result,
          originalName: file.originalname,
          fileType: result.resourceType === 'raw' ? 'pdf' : 'image',
          order: index + 1,
        }
        uploaded.push(item)
        return item
      })
    )
    return results.sort((a, b) => a.order - b.order)
  } catch (error) {
    if (uploaded.length) {
      await removeCloudinaryFiles(uploaded).catch(() => {})
    }
    throw error
  }
}

async function removeCloudinaryFiles(files) {
  if (!files || !files.length) return
  for (const file of files) {
    if (!file) continue
    const publicId = file.publicId || ''
    const url = file.url || ''

    if (publicId.startsWith('local:') || url.startsWith('/uploads/')) {
      const relativePath = publicId.startsWith('local:')
        ? publicId.replace('local:', '')
        : url.replace(/^\/uploads\/papers\//, '')
      const localFilePath = path.join(__dirname, '../../uploads/papers', relativePath)
      try {
        await fs.promises.unlink(localFilePath)
      } catch {
        // File may already have been removed
      }
    } else if (isCloudinaryConfigured() && publicId) {
      try {
        const cloudinary = configureCloudinary()
        await cloudinary.uploader.destroy(publicId, { resource_type: file.resourceType || 'image' })
      } catch (err) {
        console.warn(`Cloudinary destroy failed: ${err.message}`)
      }
    }
  }
}

module.exports = { uploadPaperFiles, removeCloudinaryFiles }
