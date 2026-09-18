import { useState } from 'react'
import { compressImage } from '../utils/imageCompressor'

const maxRawFileSize = 25 * 1024 * 1024 // Allow up to 25MB raw phone camera photos since we compress them

function isImageFile(file) {
  if (!file) return false
  if (file.type && (file.type.startsWith('image/') || ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'].includes(file.type))) {
    return true
  }
  const ext = file.name ? file.name.split('.').pop().toLowerCase() : ''
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext)
}

function FileUploader({ onFilesChange, files }) {
  const [error, setError] = useState('')
  const [isCompressing, setIsCompressing] = useState(false)

  const handleFiles = async (event) => {
    const selected = Array.from(event.target.files || [])
    if (!selected.length) return

    const invalid = selected.find((file) => !isImageFile(file) || file.size > maxRawFileSize)
    if (invalid) {
      setError(`${invalid.name} is unsupported or larger than 25 MB.`)
      event.target.value = ''
      return
    }

    if (files.length + selected.length > 10) {
      setError('Maximum 10 images allowed per paper.')
      event.target.value = ''
      return
    }

    setError('')
    setIsCompressing(true)

    try {
      // Compress each image in parallel to optimize for mobile bandwidth & serverless limits
      const compressedItems = await Promise.all(
        selected.map(async (file) => {
          const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 2200, quality: 0.75 })
          return {
            file: compressed,
            name: compressed.name || file.name,
            preview: URL.createObjectURL(compressed),
            type: 'image',
          }
        })
      )

      onFilesChange([...files, ...compressedItems])
    } catch (err) {
      console.warn('Error optimizing images:', err)
      // Fallback to uncompressed if compression fails
      const fallbackItems = selected.map((file) => ({
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
        type: 'image',
      }))
      onFilesChange([...files, ...fallbackItems])
    } finally {
      setIsCompressing(false)
      event.target.value = ''
    }
  }

  const removeFile = (index) => {
    setError('')
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))
  }

  return (
    <div className="file-uploader">
      <div className="upload-options">
        <label className="upload-option">
          <span className="upload-option-icon">⌁</span>
          <strong>Take photo</strong>
          <small>Camera ready</small>
          <input type="file" accept="image/*" capture="environment" onChange={handleFiles} disabled={isCompressing} />
        </label>
        <label className="upload-option">
          <span className="upload-option-icon">▧</span>
          <strong>Choose photos</strong>
          <small>JPG, PNG, WebP (up to 10)</small>
          <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={isCompressing} />
        </label>
      </div>
      {isCompressing && (
        <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: '#0d9488', fontWeight: 500 }}>
          Optimizing photos for upload...
        </p>
      )}
      {error && <p className="field-error">{error}</p>}
      {files.length > 0 && (
        <div className="selected-files">
          {files.map((file, index) => (
            <div className="selected-file" key={`${file.name}-${index}`}>
              {file.preview ? (
                <img src={file.preview} alt={`Preview of ${file.name}`} />
              ) : (
                <span className="pdf-preview">IMG</span>
              )}
              <span title={file.name}>{file.name}</span>
              <button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeFile(index)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileUploader