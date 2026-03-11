import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const STATUS_STYLE = {
  NOT_STARTED:                          { label: 'Not Started',                   color: '#8FA0A0', bg: '#F0F3F4', border: '#C8D8D8' },
  DOCUMENT_UPLOADED_REVIEW_NOT_STARTED: { label: 'Documents Uploaded',            color: '#2C676B', bg: '#E5EDEB', border: '#2C676B44' },
  AI_REVIEW_STARTED:                    { label: 'AI Review In Progress',          color: '#C97A2B', bg: '#FEF3E2', border: '#C97A2B44' },
  AI_REVIEW_COMPLETED:                  { label: 'AI Review Completed',            color: '#2E8B57', bg: '#EAF6EF', border: '#2E8B5744' },
  HUMAN_REVIEW_COMPLETED:               { label: 'Human Review Completed',         color: '#5B8DEF', bg: '#EDF2FF', border: '#5B8DEF44' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.NOT_STARTED
  return (
    <span style={{
      fontSize: '0.72rem',
      fontWeight: 600,
      color: s.color,
      backgroundColor: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: '20px',
      padding: '0.2rem 0.75rem',
      whiteSpace: 'nowrap',
      letterSpacing: '0.02em',
    }}>
      {s.label}
    </span>
  )
}

function RMRetrieve() {
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
      .then(data => setVendors(data.vendors || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleVendorClick = (vendorId) => {
    navigate('/questionnaire', { state: { vendor_id: vendorId } })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#EEF2EF' }}>

      {/* ── Header band ─────────────────────────────────────────────────────── */}
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
            Relationship Manager
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
            Your Vendors
          </div>
        </div>

        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
          TPRM Enterprise AI Assistant
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button
            onClick={() => navigate('/rm-upload')}
            style={{
              padding: '0.45rem 1.25rem',
              fontSize: '0.875rem',
              borderRadius: '8px',
              border: '1.5px solid #fff',
              backgroundColor: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            + Create New
          </button>
          <a onClick={() => navigate('/')} style={{ color: '#7AADAF', cursor: 'pointer', fontSize: '0.85rem' }}>
            ← Back to Home
          </a>
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '2.5rem 2rem' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>

          {loading && (
            <div style={{ color: '#8FA0A0', fontSize: '0.95rem', padding: '3rem', textAlign: 'center' }}>
              Loading vendors…
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
              No vendors registered yet.
              <br />
              <span
                onClick={() => navigate('/rm-upload')}
                style={{ color: '#2C676B', cursor: 'pointer', textDecoration: 'underline', marginTop: '0.5rem', display: 'inline-block' }}
              >
                Create your first vendor
              </span>
            </div>
          )}

          {!loading && !error && vendors.length > 0 && (
            <>
              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                padding: '0.4rem 1.25rem',
                marginBottom: '0.4rem',
              }}>
                <span style={{ fontSize: '0.68rem', color: '#8FA0A0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vendor ID</span>
                <span style={{ fontSize: '0.68rem', color: '#8FA0A0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Review Status</span>
              </div>

              {/* Vendor rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {vendors.map(vendor => (
                  <div
                    key={vendor.vendor_id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 2fr',
                      alignItems: 'center',
                      backgroundColor: '#fff',
                      border: '1px solid #D6E4E4',
                      borderRadius: '10px',
                      padding: '0.875rem 1.25rem',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(36,51,51,0.06)',
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
                    onClick={() => handleVendorClick(vendor.vendor_id)}
                  >
                    <span style={{
                      color: '#2C676B',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      letterSpacing: '0.08em',
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {vendor.vendor_id}
                    </span>

                    <StatusBadge status={vendor.review_status || 'NOT_STARTED'} />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#8FA0A0' }}>
                {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} registered
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RMRetrieve
