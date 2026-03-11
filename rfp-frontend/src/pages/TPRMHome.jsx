import { useNavigate } from 'react-router-dom'

function TPRMHome() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#EEF2EF' }}>
      {/* Top bar */}
      <div style={{
        backgroundColor: '#1C4548',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '3px solid #2C676B',
      }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: '#7AADAF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.15rem' }}>
            TPRM User
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
            TPRM Dashboard
          </div>
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
          TPRM Enterprise AI Assistant
        </div>
        <a onClick={() => navigate('/')} style={{ color: '#7AADAF', cursor: 'pointer', fontSize: '0.85rem' }}>
          ← Back
        </a>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2.5rem',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#243333', margin: 0 }}>
            What would you like to do?
          </h1>
          <p style={{ color: '#5A7070', marginTop: '0.5rem', fontSize: '1rem' }}>
            Select an action to continue
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <button
            onClick={() => navigate('/tprm/edit-questions')}
            style={{
              padding: '1.25rem 2.5rem',
              fontSize: '1rem',
              borderRadius: '10px',
              border: '2px solid #2C676B',
              backgroundColor: '#2C676B',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              boxShadow: '0 2px 8px #2C676B30',
            }}
          >
            Edit the question
          </button>
          <button
            onClick={() => navigate('/tprm/review-submissions')}
            style={{
              padding: '1.25rem 2.5rem',
              fontSize: '1rem',
              borderRadius: '10px',
              border: '2px solid #2C676B',
              backgroundColor: '#fff',
              color: '#2C676B',
              cursor: 'pointer',
              fontWeight: 600,
              boxShadow: '0 2px 8px #2C676B15',
            }}
          >
            Review submissions
          </button>
        </div>
      </div>
    </div>
  )
}

export default TPRMHome
