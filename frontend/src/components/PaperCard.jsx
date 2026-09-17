import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch, getFileUrl } from '../utils/api'

function PaperCard({ paper, navigate, onDelete }) {
  const { user } = useAuth() || {}
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isPdf = (paper.fileType || paper.type) === 'pdf'
  const pageCount = paper.filesCount || paper.files?.length || 1
  const typeLabel = isPdf ? 'PDF' : `${pageCount} page${pageCount > 1 ? 's' : ''}`

  const contributorName = paper.contributor?.name || (typeof paper.contributor === 'string' ? paper.contributor : 'Verified Student')
  const isOwner = user && (user.id === paper.userId || user.id === paper.contributor?.id || user.role === 'admin')

  const formattedDate = paper.uploadedAt
    ? new Date(paper.uploadedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently'

  const handleDelete = async () => {
    const confirmed = window.confirm(`Are you sure you want to delete "${paper.subject}"? This action cannot be undone.`)
    if (!confirmed) return

    try {
      setDeleting(true)
      await apiFetch(`/api/papers/${paper.id}`, { method: 'DELETE' })
      if (onDelete) {
        onDelete(paper.id)
      } else {
        window.location.reload()
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert(err.message || 'Failed to delete paper.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const res = await apiFetch(`/api/papers/${paper.id}/download`)
      const files = res.data?.files || []
      const primaryUrl = res.data?.downloadUrl || files[0]?.url

      if (!primaryUrl && !files.length) {
        alert('Download files are unavailable for this paper.')
        return
      }

      if (files.length > 1) {
        // Multi-page images: download each file
        files.forEach((f, idx) => {
          setTimeout(() => {
            const link = document.createElement('a')
            link.href = getFileUrl(f.url)
            link.download = f.originalName || `${paper.subject}-page-${idx + 1}.jpg`
            link.target = '_blank'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }, idx * 250)
        })
      } else {
        const fileToDownload = files[0] || {}
        const finalUrl = getFileUrl(primaryUrl || fileToDownload.url)
        const link = document.createElement('a')
        link.href = finalUrl
        link.download = fileToDownload.originalName || `${paper.subject}.${isPdf ? 'pdf' : 'jpg'}`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.error('Download error:', err)
      alert(err.message || 'Failed to download paper.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article className="paper-card">
      <div className="paper-card-top">
        <span className="paper-type">{typeLabel}</span>
        <span className="paper-year">{paper.year}</span>
      </div>
      <h3>{paper.subject}</h3>
      <div className="paper-meta">
        <span>{paper.semester} semester</span>
        <span>{paper.department || 'General'}</span>
      </div>
      <p>Contributed by {contributorName}</p>
      <small>{formattedDate}</small>
      <div className="paper-actions">
        <button type="button" onClick={() => navigate(`/papers/${paper.id}`)}>
          View <span aria-hidden="true">↗</span>
        </button>
        <button type="button" onClick={handleDownload} disabled={downloading}>
          {downloading ? 'Downloading...' : 'Download ↓'}
        </button>
        {isOwner && (
          <button
            type="button"
            style={{ color: '#ef4444' }}
            onClick={handleDelete}
            disabled={deleting}
            title="Delete this paper"
          >
            {deleting ? '...' : 'Delete'}
          </button>
        )}
      </div>
    </article>
  )
}

export default PaperCard