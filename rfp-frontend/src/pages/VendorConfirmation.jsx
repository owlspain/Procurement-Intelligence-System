import { useLocation, useNavigate } from 'react-router-dom'

function VendorConfirmation() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const vendorId = state?.vendor_id || 'Unknown'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#EEF2EF' }}>

      {/* Header band */}
      <div style={{
        backgroundColor: '#1C4548',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '3px solid #2C676B',
      }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
          TPRM Enterprise AI Assistant
        </div>
        <a onClick={() => navigate('/')} style={{ color: '#7AADAF', cursor: 'pointer', fontSize: '0.85rem' }}>
          ← Back to Home
        </a>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#243333', margin: 0 }}>
          Registration Successful
        </h2>
        <p style={{ fontSize: '1rem', color: '#5A7070', margin: 0 }}>Your Vendor ID is</p>

        <div style={{
          fontSize: '2rem',
          fontWeight: 700,
          letterSpacing: '0.2rem',
          color: '#2C676B',
          backgroundColor: '#fff',
          padding: '1rem 2.5rem',
          borderRadius: '12px',
          border: '2px solid #B8CCCC',
          boxShadow: '0 2px 12px rgba(47,111,115,0.12)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {vendorId}
        </div>

        <p style={{ fontSize: '0.85rem', color: '#8FA0A0', marginTop: '0.25rem' }}>
          Please save this ID for future reference.
        </p>
      </div>
    </div>
  )
}

export default VendorConfirmation
