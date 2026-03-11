import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// ── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  primary:      '#2C676B',
  primaryDark:  '#1C4548',
  primaryLight: '#47898D',
  primaryPale:  '#E5EDEB',
  primaryGhost: '#F2F6F4',
  bg:           '#EEF2EF',
  surface:      '#F7F9F8',
  card:         '#FFFFFF',
  text:         '#243333',
  textSub:      '#5A7070',
  textMuted:    '#8FA0A0',
  border:       '#D4E2DF',
  shadow:       '0 1px 4px rgba(36,51,51,0.07)',
  shadowHover:  '0 3px 10px rgba(44,103,107,0.13)',
}

// ── Answer value pill ────────────────────────────────────────────────────────
function AnswerPill({ value, large }) {
  if (!value) return <span style={{ fontSize: '0.82rem', color: T.textMuted }}>—</span>
  const v = value.trim().toLowerCase()
  let color = '#6B7C85', bg = '#F0F3F4', border = '#6B7C8544'
  if (v === 'yes')                     { color = '#2E8B57'; bg = '#EAF6EF'; border = '#2E8B5744' }
  else if (v === 'no')                 { color = '#B94A48'; bg = '#FAEAEA'; border = '#B94A4844' }
  else if (v.includes('insufficient')) { color = '#C97A2B'; bg = '#FEF3E2'; border = '#C97A2B44' }
  return (
    <span style={{
      fontSize: large ? '0.88rem' : '0.75rem',
      fontWeight: 600,
      color,
      backgroundColor: bg,
      border: `1px solid ${border}`,
      borderRadius: '6px',
      padding: large ? '0.3rem 0.9rem' : '0.2rem 0.65rem',
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  )
}

// ── Reviewer verdict badge ───────────────────────────────────────────────────
const VERDICT_STYLE = {
  SUPPORTED:             { label: '✓ Supported',            color: '#2E8B57', bg: '#EAF6EF', border: '#2E8B5744' },
  INSUFFICIENT_EVIDENCE: { label: '— Insufficient Evidence', color: '#6B7C85', bg: '#F0F3F4', border: '#6B7C8544' },
  REVIEW_REQUIRED:       { label: '⚠ Review Required',       color: '#C97A2B', bg: '#FEF3E2', border: '#C97A2B44' },
}

function ReviewerVerdictBadge({ verdict }) {
  if (!verdict) return null
  const s = VERDICT_STYLE[verdict] || VERDICT_STYLE.REVIEW_REQUIRED
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 600,
      color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}`,
      borderRadius: '6px', padding: '0.2rem 0.65rem',
      whiteSpace: 'nowrap', letterSpacing: '0.02em',
    }}>
      {s.label}
    </span>
  )
}

// ── Row label ────────────────────────────────────────────────────────────────
function RowLabel({ text }) {
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 700, color: T.textMuted,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      minWidth: '52px', flexShrink: 0,
    }}>
      {text}
    </span>
  )
}

// ── TPRM Question card ───────────────────────────────────────────────────────
function TPRMQuestionCard({ question, savedAnswer, isSelected, onClick }) {
  const aiValue    = savedAnswer?.answer_value  || null
  const humanValue = savedAnswer?.human_value   || null
  const verdict    = savedAnswer?.answer_state  || null

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: T.card,
        borderRadius: '10px',
        padding: '1.25rem 1.5rem',
        border: `1.5px solid ${isSelected ? T.primary : T.border}`,
        boxShadow: isSelected ? T.shadowHover : T.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        cursor: 'pointer',
        transition: 'border-color 0.18s, box-shadow 0.18s',
      }}
    >
      {/* Question header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
        <span style={{
          backgroundColor: isSelected ? T.primary : T.primaryLight,
          color: '#fff', fontSize: '0.68rem', fontWeight: 700,
          padding: '0.25rem 0.5rem', borderRadius: '4px',
          minWidth: '38px', textAlign: 'center', flexShrink: 0, marginTop: '2px',
        }}>
          {question.question_id}
        </span>
        <span style={{ fontSize: '0.92rem', color: T.text, lineHeight: 1.55, flex: 1 }}>
          {question.question_text}
          {question.mandatory_ind && (
            <span style={{ color: '#B94A48', marginLeft: '3px' }}>*</span>
          )}
        </span>
        <ReviewerVerdictBadge verdict={verdict} />
      </div>

      {/* AI answer row */}
      <div style={{ marginLeft: '50px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <RowLabel text="AI" />
        {question.question_type === 'YES_NO' ? (
          <AnswerPill value={aiValue} />
        ) : (
          <span style={{
            fontSize: '0.84rem', color: aiValue ? T.text : T.textMuted,
            lineHeight: 1.55, fontStyle: aiValue ? 'normal' : 'italic',
          }}>
            {aiValue || '—'}
          </span>
        )}
      </div>

      {/* Human answer row */}
      <div style={{ marginLeft: '50px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <RowLabel text="Human" />
        {question.question_type === 'YES_NO' ? (
          <AnswerPill value={humanValue} />
        ) : (
          <span style={{
            fontSize: '0.84rem', color: humanValue ? T.text : T.textMuted,
            lineHeight: 1.55, fontStyle: humanValue ? 'normal' : 'italic',
          }}>
            {humanValue || '—'}
          </span>
        )}
        {humanValue && humanValue !== aiValue && (
          <span style={{
            fontSize: '0.68rem', fontWeight: 600,
            color: '#5B8DEF', backgroundColor: '#EDF2FF',
            border: '1px solid #5B8DEF44', borderRadius: '5px',
            padding: '0.15rem 0.5rem', whiteSpace: 'nowrap',
          }}>
            ✏ Edited
          </span>
        )}
      </div>
    </div>
  )
}

// ── AI Review Panel ──────────────────────────────────────────────────────────
function AIReviewPanel({ vendorId, selectedQuestion }) {
  const [loading, setLoading] = useState(false)
  const [data, setData]       = useState(null)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!selectedQuestion) { setData(null); setError(null); return }
    const { questionaire_id, question_id } = selectedQuestion
    setLoading(true); setData(null); setError(null)
    fetch(`${API_BASE}/api/vendors/${vendorId}/answers/${questionaire_id}/${question_id}`)
      .then(r => { if (!r.ok) throw new Error(`No answer found (${r.status})`); return r.json() })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedQuestion, vendorId])

  if (!selectedQuestion) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: '0.75rem',
        padding: '2rem', textAlign: 'center',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          backgroundColor: T.primaryPale, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
        }}>
          🤖
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: T.primaryDark }}>AI Review Assistant</div>
        <div style={{ fontSize: '0.82rem', color: T.textMuted, maxWidth: '200px', lineHeight: 1.6 }}>
          Select any question to view AI evidence
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ color: T.textMuted, fontSize: '0.88rem', fontStyle: 'italic' }}>Loading AI analysis…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: T.primaryDark }}>AI Review Assistant</div>
        <div style={{
          marginTop: '1rem', backgroundColor: '#FEF3E2',
          border: '1px solid #C97A2B44', borderRadius: '8px',
          padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#C97A2B',
        }}>
          No AI review found for this question.
        </div>
      </div>
    )
  }

  if (!data) return null

  const confidence = data.confidence != null ? (parseFloat(data.confidence) * 100).toFixed(0) + '%' : '—'
  const citations  = Array.isArray(data.citations) ? data.citations : []

  return (
    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', overflowY: 'auto' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.primaryLight, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        AI Review Assistant
      </div>

      <div style={{
        backgroundColor: T.primaryGhost, borderRadius: '8px',
        padding: '0.85rem 1rem', fontSize: '0.87rem', color: T.text,
        lineHeight: 1.6, borderLeft: `3px solid ${T.primary}`,
      }}>
        {data.question_text}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '0.72rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>AI Answer</span>
        <AnswerPill value={data.answer_value} large />
      </div>

      {data.human_value != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.72rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Human Answer</span>
          <AnswerPill value={data.human_value} large />
        </div>
      )}

      {data.answer_state && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.68rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Reviewer Decision
          </span>
          <ReviewerVerdictBadge verdict={data.answer_state} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.68rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Rationale</span>
        <p style={{ margin: 0, fontSize: '0.85rem', color: T.textSub, lineHeight: 1.65 }}>{data.rationale || '—'}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.68rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Suggested Action</span>
        <p style={{ margin: 0, fontSize: '0.85rem', color: T.textSub, lineHeight: 1.65 }}>{data.suggestion || '—'}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '0.68rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Confidence</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: parseFloat(data.confidence) >= 0.7 ? '#2E8B57' : '#C97A2B' }}>
          {confidence}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.68rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Citations</span>
        {citations.length === 0 ? (
          <span style={{ fontSize: '0.82rem', color: T.textMuted }}>None</span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {citations.map(c => (
              <span key={c} style={{
                fontSize: '0.73rem', fontWeight: 600, color: T.primary,
                backgroundColor: T.primaryGhost, border: `1px solid ${T.primaryPale}`,
                borderRadius: '5px', padding: '0.15rem 0.55rem', letterSpacing: '0.03em',
              }}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
function TPRMVendorQuestionnaire() {
  const { state }   = useLocation()
  const navigate    = useNavigate()
  const vendorId    = state?.vendor_id || 'Unknown'

  const [questionnaires, setQuestionnaires]     = useState([])
  const [selectedId, setSelectedId]             = useState(null)
  const [allQuestions, setAllQuestions]         = useState({})
  const [savedAnswers, setSavedAnswers]         = useState({})   // key: qnId#questionId → answer item
  const [loadingQn, setLoadingQn]               = useState(true)
  const [loadingQues, setLoadingQues]           = useState(false)
  const [loadingAnswers, setLoadingAnswers]     = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState(null)

  // Fetch questionnaire list
  useEffect(() => {
    fetch(`${API_BASE}/questionnaires`)
      .then(r => r.json())
      .then(data => {
        const list = data.questionnaires || []
        setQuestionnaires(list)
        if (list.length > 0) setSelectedId(list[0].questionaire_id)
      })
      .catch(console.error)
      .finally(() => setLoadingQn(false))
  }, [])

  // Fetch all questions for all questionnaires
  useEffect(() => {
    if (questionnaires.length === 0) return
    setLoadingQues(true)
    Promise.all(
      questionnaires.map(qn =>
        fetch(`${API_BASE}/questionnaires/${qn.questionaire_id}/questions`)
          .then(r => r.json())
          .then(data => ({ id: qn.questionaire_id, questions: data.questions || [] }))
      )
    )
      .then(results => {
        const qMap = {}
        results.forEach(({ id, questions }) => { qMap[id] = questions })
        setAllQuestions(qMap)
      })
      .catch(console.error)
      .finally(() => setLoadingQues(false))
  }, [questionnaires])

  // Fetch saved answers for all questionnaires
  useEffect(() => {
    if (questionnaires.length === 0 || vendorId === 'Unknown') return
    setLoadingAnswers(true)
    Promise.all(
      questionnaires.map(qn =>
        fetch(`${API_BASE}/api/vendors/${vendorId}/answers/${qn.questionaire_id}`)
          .then(r => r.ok ? r.json() : { answers: [] })
          .then(data => ({ qnId: qn.questionaire_id, items: data.answers || [] }))
      )
    )
      .then(results => {
        const map = {}
        results.forEach(({ qnId, items }) => {
          items.forEach(item => {
            const questionId = item.sort_key.split('#')[1]
            map[`${qnId}#${questionId}`] = item
          })
        })
        setSavedAnswers(map)
      })
      .catch(console.error)
      .finally(() => setLoadingAnswers(false))
  }, [questionnaires, vendorId])

  const currentQuestions = allQuestions[selectedId] || []
  const isLoading        = loadingQn || loadingQues || loadingAnswers

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: T.bg }}>

      {/* Header */}
      <div style={{
        backgroundColor: T.primaryDark,
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `3px solid ${T.primary}`,
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: '0.63rem', color: '#7AADAF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.15rem' }}>
            Vendor ID
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>{vendorId}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>TPRM Enterprise AI Assistant</div>
          <div style={{ fontSize: '0.78rem', color: '#7AADAF', marginTop: '2px' }}>Vendor Questionnaire — Read Only</div>
          <div style={{ marginTop: '0.4rem' }}>
            <span style={{
              fontSize: '0.7rem', fontWeight: 600, color: '#5B8DEF',
              border: '1px solid #5B8DEF66', borderRadius: '20px',
              padding: '0.2rem 0.75rem', letterSpacing: '0.03em',
            }}>
              Human Review Completed
            </span>
          </div>
        </div>
        <a onClick={() => navigate('/tprm/review-submissions')} style={{ color: '#7AADAF', cursor: 'pointer', fontSize: '0.85rem' }}>
          ← Back
        </a>
      </div>

      {/* Tab band */}
      <div style={{
        backgroundColor: T.surface,
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.72rem', color: T.textMuted, marginRight: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Section:
        </span>
        {loadingQn ? (
          <span style={{ color: T.textMuted, fontSize: '0.85rem' }}>Loading…</span>
        ) : (
          questionnaires.map(qn => {
            const isActive = selectedId === qn.questionaire_id
            return (
              <button
                key={qn.questionaire_id}
                onClick={() => { setSelectedId(qn.questionaire_id); setSelectedQuestion(null) }}
                style={{
                  padding: '0.35rem 1rem', fontSize: '0.83rem', borderRadius: '20px',
                  border: `1.5px solid ${isActive ? T.primary : T.border}`,
                  backgroundColor: isActive ? T.primary : 'transparent',
                  color: isActive ? '#fff' : T.textSub,
                  cursor: 'pointer', fontWeight: isActive ? 600 : 400,
                }}
              >
                {qn.category}
              </button>
            )
          })
        )}
      </div>

      {/* Two-pane body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left pane — 70% */}
        <div style={{
          width: '70%', overflowY: 'auto',
          backgroundColor: T.bg,
          padding: '1.75rem 2rem 1.5rem',
          borderRight: `1px solid ${T.border}`,
        }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: T.textMuted, padding: '4rem', fontSize: '0.95rem' }}>
              Loading…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {currentQuestions.map(q => (
                <TPRMQuestionCard
                  key={q.question_id}
                  question={q}
                  savedAnswer={savedAnswers[`${selectedId}#${q.question_id}`] || null}
                  isSelected={
                    selectedQuestion?.question_id === q.question_id &&
                    selectedQuestion?.questionaire_id === selectedId
                  }
                  onClick={() => setSelectedQuestion({ questionaire_id: selectedId, question_id: q.question_id })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right pane — 30% */}
        <div style={{
          width: '30%', backgroundColor: T.card,
          overflowY: 'auto', borderLeft: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column',
        }}>
          <AIReviewPanel vendorId={vendorId} selectedQuestion={selectedQuestion} />
        </div>
      </div>

      {/* Footer — read-only banner */}
      <div style={{
        backgroundColor: T.card, borderTop: `1px solid ${T.border}`,
        padding: '0.875rem 2rem', flexShrink: 0,
      }}>
        <span style={{ fontSize: '0.85rem', color: '#2E8B57', fontWeight: 500 }}>
          ✓ Human review submitted — this questionnaire is locked. Click any question card to view AI analysis.
        </span>
      </div>
    </div>
  )
}

export default TPRMVendorQuestionnaire
