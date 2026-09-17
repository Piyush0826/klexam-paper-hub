import { getFileUrl } from '../utils/api'

function ImagePreview({ file, alt }) {
  if (!file) {
    return (
      <div className="pdf-placeholder">
        <h3>No preview available</h3>
      </div>
    )
  }

  const url = getFileUrl(file.url || file.src || '')
  const isPdf = file.fileType === 'pdf' || file.type === 'pdf' || (url && url.toLowerCase().includes('.pdf'))

  if (isPdf) {
    return (
      <div className="pdf-embed-container" style={{ width: '100%', minHeight: '650px', display: 'flex', flexDirection: 'column' }}>
        <object
          data={`${url}#toolbar=1`}
          type="application/pdf"
          width="100%"
          height="650px"
          style={{ border: 'none', borderRadius: '8px', flex: 1, minHeight: '600px', width: '100%', background: '#fff' }}
        >
          <iframe
            src={`${url}#toolbar=1`}
            title={alt || 'PDF Preview'}
            width="100%"
            height="650px"
            style={{ border: 'none', borderRadius: '8px', flex: 1, minHeight: '600px', width: '100%', background: '#fff' }}
          >
            <div className="pdf-fallback" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem', color: '#1e293b' }}>
                PDF Preview
              </p>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Your browser may not support inline PDF viewing.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '0.6rem 1.25rem',
                  background: '#0f172a',
                  color: '#fff',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                }}
              >
                Open PDF in new tab ↗
              </a>
            </div>
          </iframe>
        </object>
        <p style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.85rem' }}>
          Having trouble viewing?{' '}
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', textDecoration: 'underline' }}>
            Open PDF in new tab ↗
          </a>
        </p>
      </div>
    )
  }

  return <img className="paper-preview-image" src={url} alt={alt || 'Paper Page Preview'} />
}

export default ImagePreview