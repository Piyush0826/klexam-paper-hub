import { useState } from 'react'

const imageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxFileSize = 10 * 1024 * 1024

function FileUploader({ onFilesChange, files }) {
  const [error, setError] = useState('')

  const handleFiles = (event, uploadMode) => {
    const selected = Array.from(event.target.files || [])
    if (!selected.length) return

    const invalid = selected.find((file) => (![...imageTypes, 'application/pdf'].includes(file.type) || file.size > maxFileSize))
    if (invalid) {
      setError(`${invalid.name} is unsupported or larger than 10 MB.`)
      event.target.value = ''
      return
    }

    // Check if new selection contains PDF
    const hasNewPdf = selected.some((file) => file.type === 'application/pdf')
    const existingHasPdf = files.some((item) => item.type === 'pdf')
    const existingHasImage = files.some((item) => item.type === 'image')

    if (uploadMode === 'pdf' || hasNewPdf) {
      if (selected.length > 1) {
        setError('Please upload only one PDF file.')
        event.target.value = ''
        return
      }
      if (existingHasImage) {
        setError('Cannot combine PDF with images. Please remove images first or replace them with this PDF.')
      }
      // Replace with single PDF
      setError('')
      const pdfItem = {
        file: selected[0],
        name: selected[0].name,
        preview: null,
        type: 'pdf',
      }
      onFilesChange([pdfItem])
      event.target.value = ''
      return
    }

    // Image upload
    if (existingHasPdf) {
      setError('You already selected a PDF. Remove the PDF first to upload images.')
      event.target.value = ''
      return
    }

    const nextFiles = [
      ...files,
      ...selected.map((file) => ({
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
        type: 'image',
      })),
    ]

    if (nextFiles.length > 10) {
      setError('Maximum 10 images allowed per paper.')
      event.target.value = ''
      return
    }

    setError('')
    onFilesChange(nextFiles)
    event.target.value = ''
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
          <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFiles(e, 'image')} />
        </label>
        <label className="upload-option">
          <span className="upload-option-icon">▧</span>
          <strong>Choose photos</strong>
          <small>JPG, PNG, WebP (up to 10)</small>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => handleFiles(e, 'image')} />
        </label>
        <label className="upload-option">
          <span className="upload-option-icon">▤</span>
          <strong>Upload PDF</strong>
          <small>Single PDF up to 10 MB</small>
          <input type="file" accept="application/pdf" onChange={(e) => handleFiles(e, 'pdf')} />
        </label>
      </div>
      {error && <p className="field-error">{error}</p>}
      {files.length > 0 && (
        <div className="selected-files">
          {files.map((file, index) => (
            <div className="selected-file" key={`${file.name}-${index}`}>
              {file.preview ? (
                <img src={file.preview} alt={`Preview of ${file.name}`} />
              ) : (
                <span className="pdf-preview">PDF</span>
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