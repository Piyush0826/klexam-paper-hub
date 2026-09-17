import { useState } from 'react'
import Button from '../components/Button'
import FileUploader from '../components/FileUploader'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../utils/api'

function UploadPaper({ navigate }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ department: '', semester: '', year: '', subject: '' })
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedPaper, setUploadedPaper] = useState(null)

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }))
    }
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.subject.trim()) nextErrors.subject = 'Enter the paper subject.'
    else if (form.subject.trim().length > 150) nextErrors.subject = 'Subject must be 150 characters or fewer.'

    if (!form.semester) nextErrors.semester = 'Choose a semester (Odd or Even).'

    const parsedYear = Number(form.year.trim())
    if (!form.year.trim()) nextErrors.year = 'Enter the exam year.'
    else if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
      nextErrors.year = 'Enter a valid year (e.g. 2024).'
    }

    if (!files.length) {
      nextErrors.files = 'Add at least one paper file (PDF or photo).'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = async (event) => {
    event.preventDefault()
    setApiError('')

    if (!validate()) return

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('subject', form.subject.trim())
      if (form.department.trim()) formData.append('department', form.department.trim())
      formData.append('semester', form.semester)
      formData.append('year', form.year.trim())

      files.forEach((fileItem) => {
        formData.append('files', fileItem.file)
      })

      const response = await apiFetch('/api/papers/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.success && response.data?.paper) {
        setUploadedPaper(response.data.paper)
      } else {
        setUploadedPaper({ subject: form.subject, year: form.year, semester: form.semester })
      }
    } catch (err) {
      console.error('Paper upload failed:', err)
      setApiError(err.message || 'Failed to upload paper. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm({ department: '', semester: '', year: '', subject: '' })
    setFiles([])
    setErrors({})
    setApiError('')
    setUploadedPaper(null)
  }

  if (uploadedPaper) {
    return (
      <section className="success-page">
        <div className="success-card">
          <span className="success-icon">✓</span>
          <p className="eyebrow">Upload complete</p>
          <h1>Paper submitted <em>successfully.</em></h1>
          <p>
            <strong>{uploadedPaper.subject}</strong> ({uploadedPaper.year} · {uploadedPaper.semester} Semester)
            has been saved to the archive and is now searchable by the college community.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {uploadedPaper.id && (
              <Button onClick={() => navigate(`/papers/${uploadedPaper.id}`)}>
                View paper ↗
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/search')}>
              Search archive
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Upload another
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ME'

  return (
    <section className="workspace-page upload-page">
      <div className="page-wrap">
        <div className="page-heading">
          <p className="eyebrow">Contribute to the archive</p>
          <h1>Upload a <em>paper.</em></h1>
          <p>Share a useful resource with the people studying alongside you.</p>
        </div>

        {apiError && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', background: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', color: '#991b1b' }}>
            {apiError}
          </div>
        )}

        <div className="upload-layout">
          <form className="upload-form" onSubmit={submit} noValidate>
            <div className="account-strip">
              <div className="avatar">{userInitials}</div>
              <div>
                <strong>{user?.name || 'Verified User'}</strong>
                <span>ID: {user?.collegeId || '—'}</span>
              </div>
              <small>Account details</small>
            </div>

            <div className="form-split">
              <label>
                Department
                <input
                  value={form.department}
                  onChange={(event) => update('department', event.target.value)}
                  placeholder="e.g. CSE, IT, ECE (Optional)"
                />
              </label>
              <label>
                Semester
                <select value={form.semester} onChange={(event) => update('semester', event.target.value)}>
                  <option value="">Choose semester</option>
                  <option value="Odd">Odd</option>
                  <option value="Even">Even</option>
                </select>
                {errors.semester && <small className="field-error">{errors.semester}</small>}
              </label>
            </div>

            <div className="form-split">
              <label>
                Year
                <input
                  inputMode="numeric"
                  value={form.year}
                  onChange={(event) => update('year', event.target.value)}
                  placeholder="e.g. 2024"
                />
                {errors.year && <small className="field-error">{errors.year}</small>}
              </label>
              <label>
                Subject
                <input
                  value={form.subject}
                  onChange={(event) => update('subject', event.target.value)}
                  placeholder="e.g. Data Structures"
                />
                {errors.subject && <small className="field-error">{errors.subject}</small>}
              </label>
            </div>

            <div className="upload-field">
              <div className="upload-field-heading">
                <label>Upload paper</label>
                <span>Max 10 MB per file</span>
              </div>
              <FileUploader files={files} onFilesChange={setFiles} />
              {errors.files && <p className="field-error">{errors.files}</p>}
            </div>

            <p className="auto-time">↻ Upload date and time will be automatically recorded.</p>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading paper...' : <>Upload paper <span aria-hidden="true">↗</span></>}
            </Button>
          </form>

          <aside className="upload-preview">
            <p className="eyebrow">Submission preview</p>
            <h2>Check your <em>details.</em></h2>
            <dl>
              <div>
                <dt>Contributor</dt>
                <dd>{user?.name || '—'}</dd>
              </div>
              <div>
                <dt>ID</dt>
                <dd>{user?.collegeId || '—'}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{form.department || 'Not specified'}</dd>
              </div>
              <div>
                <dt>Semester / year</dt>
                <dd>{form.semester || '—'} · {form.year || '—'}</dd>
              </div>
              <div>
                <dt>Subject</dt>
                <dd>{form.subject || '—'}</dd>
              </div>
              <div>
                <dt>Files</dt>
                <dd>
                  {files.length
                    ? files.map((file) => file.name).join(', ')
                    : 'No files selected'}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </section>
  )
}

export default UploadPaper