import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function uploadToS3(file, docType) {
  const res = await fetch(`${API_BASE}/presigned-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doc_type: docType,
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to get upload URL')
  }

  const { url, key } = await res.json()

  const s3Res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })

  if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`)
  return key
}

function FileUploadBox({ label, file, inputRef, onFileChange }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      border: `2px dashed ${file ? '#2C676B' : '#B6C8C5'}`,
      borderRadius: '12px',
      padding: '2rem 3rem',
      textAlign: 'center',
      minWidth: '220px',
      boxShadow: '0 1px 4px rgba(36,51,51,0.07)',
      transition: 'border-color 0.2s',
    }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#243333', fontWeight: 600 }}>{label}</h3>
      <input
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ref={inputRef}
        style={{ display: 'none' }}
        onChange={(e) => onFileChange(e.target.files[0] || null)}
      />
      <button
        onClick={() => inputRef.current.click()}
        style={{
          padding: '0.6rem 1.4rem',
          fontSize: '0.9rem',
          borderRadius: '8px',
          border: '1.5px solid #2C676B',
          backgroundColor: 'transparent',
          color: '#2C676B',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Choose File
      </button>
      {file && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#5A7070' }}>
          {file.name}
        </p>
      )}
    </div>
  )
}

function RMUpload() {
  const navigate = useNavigate()
  const [msaFile, setMsaFile] = useState(null)
  const [sowFile, setSowFile] = useState(null)
  const msaInputRef = useRef(null)
  const sowInputRef = useRef(null)

  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [s3Keys, setS3Keys] = useState({ msa: null, sow: null })
  const [registering, setRegistering] = useState(false)

  const bothUploaded = msaFile && sowFile

  const handleNext = async () => {
    setRegistering(true)
    try {
      const res = await fetch(`${API_BASE}/register-vendor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sow_key: s3Keys.sow, msa_key: s3Keys.msa }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to register vendor')
      }
      const { vendor_id } = await res.json()
      navigate('/questionnaire', { state: { vendor_id } })
    } catch (err) {
      console.error(err)
      setErrorMessage(err.message)
      setUploadStatus('error')
    } finally {
      setRegistering(false)
    }
  }

  const handleUploadDocuments = async () => {
    setUploading(true)
    setUploadStatus(null)
    setErrorMessage('')
    try {
      const [msaKey, sowKey] = await Promise.all([
        uploadToS3(msaFile, 'msa'),
        uploadToS3(sowFile, 'sow'),
      ])
      setS3Keys({ msa: msaKey, sow: sowKey })
      setUploadStatus('success')
    } catch (err) {
      console.error(err)
      setErrorMessage(err.message)
      setUploadStatus('error')
    } finally {
      setUploading(false)
    }
  }

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
        <div>
          <div style={{ fontSize: '0.65rem', color: '#7AADAF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.15rem' }}>
            Relationship Manager
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
            Upload Documents
          </div>
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
          TPRM Enterprise AI Assistant
        </div>
        <a onClick={() => navigate('/rm-retrieve')} style={{ color: '#7AADAF', cursor: 'pointer', fontSize: '0.85rem' }}>
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
        gap: '2rem',
        padding: '3rem 2rem',
      }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <FileUploadBox label="Upload MSA" file={msaFile} inputRef={msaInputRef} onFileChange={setMsaFile} />
          <FileUploadBox label="Upload SoW" file={sowFile} inputRef={sowInputRef} onFileChange={setSowFile} />
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            disabled={!bothUploaded || uploading}
            onClick={handleUploadDocuments}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: bothUploaded && !uploading ? '#2C676B' : '#B6C8C5',
              color: '#fff',
              cursor: bothUploaded && !uploading ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
          >
            {uploading ? 'Uploading…' : 'Upload Documents'}
          </button>

          {uploadStatus === 'success' && (
            <button
              onClick={handleNext}
              disabled={registering}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: registering ? '#B6C8C5' : '#2E8B57',
                color: '#fff',
                cursor: registering ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {registering ? 'Registering…' : 'Next →'}
            </button>
          )}
        </div>

        {uploadStatus === 'success' && (
          <p style={{ color: '#2E8B57', fontSize: '0.9rem', margin: 0 }}>
            Both files uploaded successfully.
          </p>
        )}
        {uploadStatus === 'error' && (
          <p style={{ color: '#B94A48', fontSize: '0.9rem', margin: 0 }}>
            Upload failed: {errorMessage}
          </p>
        )}
      </div>
    </div>
  )
}

export default RMUpload
