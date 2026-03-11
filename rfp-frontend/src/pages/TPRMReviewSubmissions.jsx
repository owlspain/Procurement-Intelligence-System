import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function TPRMReviewSubmissions() {
  const navigate = useNavigate()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/vendors`)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to fetch vendors (${r.status})`)
        return r.json()
      })
      .then(data => {
        const completed = (data.vendors || []).filter(
          v => v.review_status === 'HUMAN_REVIEW_COMPLETED'
        )
        setVendors(completed)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#EEF2EF' }}>

      {/* Header */}
      <div style={{
        backgroundColor: '#1C4548',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '3px solid #2C676B',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: '#7AADAF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.15rem' }}>
            TPRM User
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
            Review Submissions
          </div>
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
          TPRM Enterprise AI Assistant
        </div>
        <a onClick={() => navigate('/tprm')} style={{ color: '#7AADAF', cursor: 'pointer', fontSize: '0.85rem' }}>
          ← Back
        </a>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '2.5rem 2rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>

          {loading && (
            <div style={{ color: '#8FA0A0', fontSize: '0.95rem', padding: '3rem', textAlign: 'center' }}>
              Loading submissions…
            </div>
          )}

          {error && (
            <div style={{
              color: '#B94A48',
              backgroundColor: '#FDF2F2',
              border: '1px solid #E8C4C3',
              borderRadius: '8px',
              padding: '1rem 1.25rem',
              fontSize: '0.9rem',
            }}>
              Error: {error}
            </div>
          )}

          {!loading && !error && vendors.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: '#8FA0A0',
              padding: '4rem 2rem',
              fontSize: '0.95rem',
              border: '1px dashed #C8D8D8',
              borderRadius: '12px',
              backgroundColor: '#fff',
            }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>📋</div>
              No completed reviews found.
            </div>
          )}

          {!loading && !error && vendors.length > 0 && (
            <>
              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                padding: '0.4rem 1.25rem',
                marginBottom: '0.4rem',
              }}>
                <span style={{ fontSize: '0.68rem', color: '#8FA0A0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vendor ID</span>
                <span style={{ fontSize: '0.68rem', color: '#8FA0A0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Status</span>
              </div>

              {/* Vendor rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {vendors.map(vendor => (
                  <div
                    key={vendor.vendor_id}
                    onClick={() => navigate('/tprm/vendor-review', { state: { vendor_id: vendor.vendor_id } })}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      alignItems: 'center',
                      backgroundColor: '#fff',
                      border: '1px solid #D6E4E4',
                      borderRadius: '10px',
                      padding: '0.875rem 1.25rem',
                      boxShadow: '0 1px 3px rgba(36,51,51,0.06)',
                      cursor: 'pointer',
                      transition: 'border-color 0.18s, box-shadow 0.18s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#2C676B'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(47,111,115,0.12)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#D6E4E4'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(36,51,51,0.06)'
                    }}
                  >
                    <span style={{
                      color: '#2C676B',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      letterSpacing: '0.08em',
                      fontVariantNumeric: 'tabular-nums',
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                    }}>
                      {vendor.vendor_id}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#5B8DEF',
                      backgroundColor: '#EDF2FF',
                      border: '1px solid #5B8DEF44',
                      borderRadius: '20px',
                      padding: '0.2rem 0.75rem',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.02em',
                      display: 'inline-block',
                    }}>
                      Human Review Completed
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#8FA0A0' }}>
                {vendors.length} submission{vendors.length !== 1 ? 's' : ''} completed
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default TPRMReviewSubmissions
