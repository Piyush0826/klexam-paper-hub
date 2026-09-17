import { useState, useEffect } from 'react'
import Button from '../components/Button'
import ImagePreview from '../components/ImagePreview'
import { useAuth } from '../context/AuthContext'
import { apiFetch, getFileUrl } from '../utils/api'

function ViewPaper({ navigate, paperId }) {
  const { user } = useAuth()
  const [paper, setPaper] = useState(null)
  const [page, setPage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState(false)

  // Report modal state
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('wrong_subject')
  const [reportDetails, setReportDetails] = useState('')
  const [reportStatus, setReportStatus] = useState({ loading: false, success: false, error: '' })

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError('')

    apiFetch(`/api/papers/${paperId}`)
      .then((res) => {
        if (isMounted) {
          if (res.success && res.data?.paper) {
            setPaper(res.data.paper)
          } else {
            setError('Paper not found')
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load paper:', err)
          setError(err.message || 'Paper not found or unavailable')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [paperId])

  const handleDelete = async () => {
    if (!paper) return
    const confirmed = window.confirm(`Are you sure you want to delete "${paper.subject}"? This action cannot be undone.`)
    if (!confirmed) return

    setDeleting(true)
    try {
      await apiFetch(`/api/papers/${paper.id}`, { method: 'DELETE' })
      alert('Paper deleted successfully.')
      navigate('/dashboard')
    } catch (err) {
      console.error('Delete paper error:', err)
      alert(err.message || 'Failed to delete paper.')
      setDeleting(false)
    }
  }

  const handleDeleteCurrentPhoto = async () => {
    if (!paper || !files.length) return
    const isLastFile = files.length <= 1
    const confirmed = window.confirm(
      isLastFile
        ? `Are you sure you want to delete this photo? Since it is the only photo in this paper, the paper will be removed entirely.`
        : `Are you sure you want to delete photo page ${page + 1}?`
    )
    if (!confirmed) return

    setDeletingPhoto(true)
    try {
      const res = await apiFetch(`/api/papers/${paper.id}/files/${page}`, { method: 'DELETE' })
      if (res.data?.paperDeleted) {
        alert('Photo and paper deleted successfully.')
        navigate('/dashboard')
      } else {
        setPaper((prev) => ({ ...prev, files: res.data.files }))
        setPage((prev) => Math.max(0, Math.min(prev, res.data.files.length - 1)))
        alert('Photo page deleted successfully.')
      }
    } catch (err) {
      console.error('Delete photo error:', err)
      alert(err.message || 'Failed to delete photo.')
    } finally {
      setDeletingPhoto(false)
    }
  }

  const handleDownload = async () => {
    if (!paper) return
    try {
      setDownloading(true)
      const res = await apiFetch(`/api/papers/${paper.id}/download`)
      const files = res.data?.files || []
      const primaryUrl = res.data?.downloadUrl || files[0]?.url

      if (!primaryUrl && !files.length) {
        alert('No downloadable files found for this paper.')
        return
      }

      if (files.length > 1) {
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
        link.download = fileToDownload.originalName || `${paper.subject}.${paper.fileType === 'pdf' ? 'pdf' : 'jpg'}`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.error('Download failed:', err)
      alert(err.message || 'Failed to download paper.')
    } finally {
      setDownloading(false)
    }
  }

  const handleReportSubmit = async (e) => {
    e.preventDefault()
    setReportStatus({ loading: true, success: false, error: '' })
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          paperId: paper.id,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      })
      setReportStatus({ loading: false, success: true, error: '' })
      setTimeout(() => {
        setShowReport(false)
        setReportStatus({ loading: false, success: false, error: '' })
      }, 2000)
    } catch (err) {
      setReportStatus({ loading: false, success: false, error: err.message || 'Failed to submit report' })
    }
  }

  if (isLoading) {
    return (
      <section className="empty-page">
        <h1>Loading paper preview...</h1>
        <p>Fetching examination paper details from the community archive.</p>
      </section>
    )
  }

  if (error || !paper) {
    return (
      <section className="empty-page">
        <h1>Paper not found.</h1>
        <p>{error || 'The requested paper could not be found.'}</p>
        <Button onClick={() => navigate('/search')}>Back to search</Button>
      </section>
    )
  }

  const files = Array.isArray(paper.files) ? paper.files : []
  const currentFile = files[page] || files[0] || { url: paper.fileUrl, fileType: paper.fileType }
  const isImage = paper.fileType === 'image' && files.length > 0
  const contributorName = paper.contributor?.name || 'Verified Member'
  const isOwner = user && (user.id === paper.userId || user.id === paper.contributor?.id || user.role === 'admin')
  const formattedDate = paper.uploadedAt
    ? new Date(paper.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown'

  return (
    <section className="workspace-page view-page">
      <div className="page-wrap">
        <button className="back-link" type="button" onClick={() => navigate('/search')}>
          ← Back to papers
        </button>

        <div className="view-header">
          <div>
            <p className="eyebrow">Paper preview</p>
            <h1>{paper.subject}</h1>
            <p>
              {paper.year} · {paper.semester} semester · {paper.department || 'General'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {isOwner && (
              <Button
                variant="outline"
                style={{ borderColor: '#ef4444', color: '#ef4444' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete paper 🗑'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowReport(true)}>
              Report paper ⚑
            </Button>
            <Button variant="dark" onClick={handleDownload} disabled={downloading}>
              {downloading ? 'Downloading...' : 'Download paper ↓'}
            </Button>
          </div>
        </div>

        <div className="viewer-layout">
          <div className="paper-viewer">
            <ImagePreview file={currentFile} alt={`${paper.subject}, page ${page + 1}`} />

            {isImage && (
              <div className="viewer-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                {files.length > 1 ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      ← Previous
                    </button>
                    <span>
                      Page {page + 1} of {files.length}
                    </span>
                    <button
                      type="button"
                      disabled={page === files.length - 1}
                      onClick={() => setPage((p) => Math.min(files.length - 1, p + 1))}
                    >
                      Next →
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Single photo</span>
                )}

                {isOwner && (
                  <button
                    type="button"
                    style={{
                      color: '#ef4444',
                      backgroundColor: '#fff',
                      border: '1px solid #fca5a5',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                    }}
                    onClick={handleDeleteCurrentPhoto}
                    disabled={deletingPhoto}
                    title="Delete this photo"
                  >
                    {deletingPhoto ? 'Deleting photo...' : 'Delete this photo ✕'}
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="view-details">
            <p className="eyebrow">About this paper</p>
            <dl>
              <div>
                <dt>Subject</dt>
                <dd>{paper.subject}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{paper.department || 'Not specified'}</dd>
              </div>
              <div>
                <dt>Semester</dt>
                <dd>{paper.semester}</dd>
              </div>
              <div>
                <dt>Year</dt>
                <dd>{paper.year}</dd>
              </div>
              <div>
                <dt>Contributor</dt>
                <dd>{contributorName}</dd>
              </div>
              <div>
                <dt>Uploaded</dt>
                <dd>{formattedDate}</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>
                  {paper.fileType === 'pdf'
                    ? 'PDF document'
                    : `${files.length || 1} image page${(files.length || 1) > 1 ? 's' : ''}`}
                </dd>
              </div>
            </dl>
            <p>Shared by a member of the college community for study and preparation.</p>
          </aside>
        </div>

        {showReport && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Report this paper</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                If this paper has issues (e.g. wrong subject, poor quality, wrong year), let the moderators know.
              </p>

              {reportStatus.success ? (
                <div style={{ padding: '1rem', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', marginBottom: '1rem' }}>
                  ✓ Report submitted successfully. Thank you for keeping the archive clean!
                </div>
              ) : (
                <form onSubmit={handleReportSubmit}>
                  {reportStatus.error && (
                    <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      {reportStatus.error}
                    </div>
                  )}

                  <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '500' }}>
                    Reason
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}
                    >
                      <option value="wrong_subject">Wrong subject title</option>
                      <option value="wrong_year">Wrong examination year</option>
                      <option value="wrong_semester">Wrong semester</option>
                      <option value="duplicate">Duplicate paper</option>
                      <option value="inappropriate">Inappropriate content</option>
                      <option value="other">Other issue</option>
                    </select>
                  </label>

                  <label style={{ display: 'block', marginBottom: '1.5rem', fontWeight: '500' }}>
                    Details (optional)
                    <textarea
                      rows={3}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Briefly explain the issue..."
                      style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem' }}
                    />
                  </label>

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowReport(false)}
                      disabled={reportStatus.loading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={reportStatus.loading}>
                      {reportStatus.loading ? 'Submitting...' : 'Submit Report'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ViewPaper