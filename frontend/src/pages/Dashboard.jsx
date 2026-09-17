import { useState, useEffect, useCallback } from 'react'
import Button from '../components/Button'
import PaperCard from '../components/PaperCard'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../utils/api'

function Dashboard({ navigate }) {
  const { user } = useAuth()
  const [recentPapers, setRecentPapers] = useState([])
  const [contributions, setContributions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [recentRes, myRes] = await Promise.allSettled([
        apiFetch('/api/papers?limit=3'),
        apiFetch('/api/papers/my'),
      ])

      if (recentRes.status === 'fulfilled' && recentRes.value.success) {
        setRecentPapers(recentRes.value.data?.papers || [])
      }

      if (myRes.status === 'fulfilled' && myRes.value.success) {
        setContributions(myRes.value.data?.papers || [])
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load some dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const handleDeletePaper = async (paperId, subject) => {
    if (!window.confirm(`Are you sure you want to delete "${subject}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingId(paperId)
      await apiFetch(`/api/papers/${paperId}`, { method: 'DELETE' })
      setContributions((prev) => prev.filter((p) => p.id !== paperId))
      setRecentPapers((prev) => prev.filter((p) => p.id !== paperId))
    } catch (err) {
      console.error('Failed to delete paper:', err)
      alert(err.message || 'Failed to delete paper')
    } finally {
      setDeletingId(null)
    }
  }

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ME'

  return (
    <section className="workspace-page">
      <div className="page-wrap">
        <div className="dashboard-head">
          <div>
            <p className="eyebrow">{user?.role === 'faculty' ? 'Faculty' : user?.role === 'admin' ? 'Admin' : 'Student'} dashboard</p>
            <h1>
              Welcome back, <em>{user?.name || 'Scholar'}</em>.
            </h1>
            <p className="dashboard-intro">Ready to turn a little preparation into a lot more confidence?</p>
          </div>
          <Button onClick={() => navigate('/upload')}>+ Upload paper</Button>
        </div>

        <div className="dashboard-search">
          <div>
            <strong>Find your next paper</strong>
            <span>Search the community archive by subject, semester, or year.</span>
          </div>
          <Button variant="dark" onClick={() => navigate('/search')}>
            Search papers <span aria-hidden="true">⌕</span>
          </Button>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', color: '#991b1b', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <div className="dashboard-grid">
          <section>
            <div className="section-label">
              <h2>Recent papers</h2>
              <button type="button" onClick={() => navigate('/search')}>
                View all ↗
              </button>
            </div>

            {loading ? (
              <p style={{ color: '#64748b' }}>Loading recent papers...</p>
            ) : recentPapers.length > 0 ? (
              <div className="paper-grid">
                {recentPapers.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    navigate={navigate}
                    onDelete={(id) => {
                      setRecentPapers((prev) => prev.filter((p) => p.id !== id))
                      setContributions((prev) => prev.filter((p) => p.id !== id))
                    }}
                  />
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>No papers uploaded yet. Be the first to contribute!</p>
            )}
          </section>

          <aside className="account-card">
            <p className="eyebrow">Your account</p>
            <div className="avatar">{userInitials}</div>
            <h3>{user?.name || 'Verified Member'}</h3>
            <p className="account-role">{user?.role === 'faculty' ? 'Faculty Member' : user?.role === 'admin' ? 'Administrator' : 'Verified Student'}</p>
            <dl>
              <div>
                <dt>College ID</dt>
                <dd>{user?.collegeId || '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user?.email || '—'}</dd>
              </div>
            </dl>
            <p className="account-note">Your account details are attached automatically when you contribute a paper.</p>
          </aside>
        </div>

        <section className="contributions-section">
          <div className="section-label">
            <h2>My contributions</h2>
            <span>
              {contributions.length} paper{contributions.length === 1 ? '' : 's'} shared
            </span>
          </div>

          {loading ? (
            <p style={{ color: '#64748b' }}>Loading your uploads...</p>
          ) : contributions.length > 0 ? (
            contributions.map((paper) => (
              <div className="contribution-row" key={paper.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{paper.subject}</strong>
                  <span>
                    {paper.year} · {paper.semester} semester {paper.department ? `· ${paper.department}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => navigate(`/papers/${paper.id}`)}>
                    View paper ↗
                  </button>
                  <button
                    type="button"
                    style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => handleDeletePaper(paper.id, paper.subject)}
                    disabled={deletingId === paper.id}
                  >
                    {deletingId === paper.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#64748b', fontStyle: 'italic' }}>
              You haven't uploaded any papers yet. Click &ldquo;+ Upload paper&rdquo; above to share!
            </p>
          )}
        </section>
      </div>
    </section>
  )
}

export default Dashboard