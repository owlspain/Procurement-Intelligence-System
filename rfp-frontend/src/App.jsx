import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import RMUpload from './pages/RMUpload.jsx'
import RMRetrieve from './pages/RMRetrieve.jsx'
import VendorConfirmation from './pages/VendorConfirmation.jsx'
import Questionnaire from './pages/Questionnaire.jsx'
import TPRMHome from './pages/TPRMHome.jsx'
import TPRMReviewSubmissions from './pages/TPRMReviewSubmissions.jsx'
import TPRMVendorQuestionnaire from './pages/TPRMVendorQuestionnaire.jsx'
import TPRMEditQuestions from './pages/TPRMEditQuestions.jsx'
import './App.css'

function Home() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#EEF2EF' }}>
      {/* Top bar */}
      <div style={{
        backgroundColor: '#1C4548',
        padding: '1rem 2rem',
        borderBottom: '3px solid #2C676B',
      }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
          TPRM Enterprise AI Assistant
        </div>
      </div>

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
            Welcome
          </h1>
          <p style={{ color: '#5A7070', marginTop: '0.5rem', fontSize: '1rem' }}>
            Select your role to continue
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <button
            onClick={() => navigate('/rm-retrieve')}
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
            Relationship Manager (RM)
          </button>
          <button
            onClick={() => navigate('/tprm')}
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
            TPRM User
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rm-retrieve" element={<RMRetrieve />} />
        <Route path="/rm-upload" element={<RMUpload />} />
        <Route path="/vendor-confirmation" element={<VendorConfirmation />} />
        <Route path="/questionnaire" element={<Questionnaire />} />
        <Route path="/tprm" element={<TPRMHome />} />
        <Route path="/tprm/review-submissions" element={<TPRMReviewSubmissions />} />
        <Route path="/tprm/vendor-review" element={<TPRMVendorQuestionnaire />} />
        <Route path="/tprm/edit-questions" element={<TPRMEditQuestions />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
