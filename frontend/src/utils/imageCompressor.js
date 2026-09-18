/**
 * Compresses an image File using an offscreen HTML Canvas.
 * Automatically resizes dimensions if they exceed maxWidth/maxHeight (preserving aspect ratio)
 * and encodes to JPEG at the specified quality.
 *
 * For exam papers:
 * - A 12MP-48MP mobile camera photo (5MB - 12MB) is compressed to ~200KB - 350KB.
 * - Text, formulas, and handwritten notes remain sharp and readable.
 * - Total payload for 5-10 pages stays well under 3MB (safely below Vercel's 4.5MB limit).
 *
 * @param {File} file - Original file
 * @param {object} [options]
 * @param {number} [options.maxWidth=1600]
 * @param {number} [options.maxHeight=2200]
 * @param {number} [options.quality=0.75]
 * @returns {Promise<File>} - Compressed File, or original if not compressible
 */
export async function compressImage(file, options = {}) {
  // If not a compressible image (e.g. PDF, SVG, GIF), return untouched
  if (!file) return file
  const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '')
  if (!isImage || file.type?.includes('svg') || file.type?.includes('gif')) {
    return file
  }

  const {
    maxWidth = 1600,
    maxHeight = 2200,
    quality = 0.75,
  } = options

  return new Promise((resolve) => {
    // If browser supports createImageBitmap, try it for speed and automatic EXIF orientation
    if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
      createImageBitmap(file)
        .then((bitmap) => {
          const { width, height } = calculateDimensions(bitmap.width, bitmap.height, maxWidth, maxHeight)
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            bitmap.close?.()
            resolve(file)
            return
          }

          // Solid white background helps with dark mode screenshots / transparent PNGs
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(bitmap, 0, 0, width, height)
          bitmap.close?.()

          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                resolve(file)
                return
              }

              const baseName = (file.name || 'paper-photo').replace(/\.[^.]+$/, '')
              const compressedFile = new File([blob], `${baseName}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            },
            'image/jpeg',
            quality
          )
        })
        .catch(() => {
          // Fallback to Image element if createImageBitmap fails
          compressWithImageElement(file, maxWidth, maxHeight, quality, resolve)
        })
    } else {
      compressWithImageElement(file, maxWidth, maxHeight, quality, resolve)
    }
  })
}

function calculateDimensions(width, height, maxWidth, maxHeight) {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height }
  }
  const ratio = Math.min(maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

function compressWithImageElement(file, maxWidth, maxHeight, quality, resolve) {
  const reader = new FileReader()
  reader.onerror = () => resolve(file)
  reader.onload = (e) => {
    const img = new Image()
    img.onerror = () => resolve(file)
    img.onload = () => {
      try {
        const { width, height } = calculateDimensions(img.width, img.height, maxWidth, maxHeight)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file)
              return
            }

            const baseName = (file.name || 'paper-photo').replace(/\.[^.]+$/, '')
            const compressedFile = new File([blob], `${baseName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          quality
        )
      } catch {
        resolve(file)
      }
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}
