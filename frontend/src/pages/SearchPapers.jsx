import { useState, useEffect, useCallback } from 'react'
import EmptyState from '../components/EmptyState'
import FilterBar from '../components/FilterBar'
import PaperCard from '../components/PaperCard'
import SearchBar from '../components/SearchBar'
import Button from '../components/Button'
import { apiFetch } from '../utils/api'

function SearchPapers({ navigate }) {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [filters, setFilters] = useState({ department: '', semester: '', year: '' })
  const [papers, setPapers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalPages: 1, totalItems: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPapers = useCallback(async (page = 1) => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (submittedQuery.trim()) params.set('subject', submittedQuery.trim())
      if (filters.department) params.set('department', filters.department)
      if (filters.semester) params.set('semester', filters.semester)
      if (filters.year) params.set('year', filters.year)
      params.set('page', String(page))
      params.set('limit', '12')

      const res = await apiFetch(`/api/papers?${params.toString()}`)
      if (res.success && res.data) {
        setPapers(res.data.papers || [])
        if (res.data.pagination) {
          setPagination(res.data.pagination)
        }
      }
    } catch (err) {
      console.error('Failed to load papers:', err)
      setError(err.message || 'Failed to search papers. Please try again.')
      setPapers([])
    } finally {
      setIsLoading(false)
    }
  }, [submittedQuery, filters])

  useEffect(() => {
    loadPapers(1)
  }, [loadPapers])

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setSubmittedQuery(query)
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadPapers(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <section className="workspace-page search-page">
      <div className="page-wrap">
        <div className="page-heading">
          <p className="eyebrow">Community archive</p>
          <h1>Find a paper, <em>keep moving.</em></h1>
          <p>Search previous examination papers contributed by your college community.</p>
        </div>

        <div className="search-panel">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={handleSearchSubmit}
          />
          <FilterBar filters={filters} onChange={updateFilter} />
        </div>

        {error && (
          <div style={{ padding: '1rem', marginBottom: '1.5rem', background: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <Button variant="outline" onClick={() => loadPapers(1)}>Retry</Button>
          </div>
        )}

        <div className="results-heading">
          <h2>
            {submittedQuery ? `Results for “${submittedQuery}”` : 'All available papers'}
          </h2>
          <span>
            {isLoading ? 'Searching...' : `${pagination.totalItems} paper${pagination.totalItems === 1 ? '' : 's'}`}
          </span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <p>Loading papers from archive...</p>
          </div>
        ) : papers.length > 0 ? (
          <>
            <div className="paper-grid search-results">
              {papers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  navigate={navigate}
                  onDelete={(id) => setPapers((prev) => prev.filter((p) => p.id !== id))}
                />
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2.5rem' }}>
                <Button
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  ← Previous
                </Button>
                <span style={{ fontSize: '0.95rem', color: '#475569' }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  )
}

export default SearchPapers