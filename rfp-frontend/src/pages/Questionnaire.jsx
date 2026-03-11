import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// ── Theme tokens ────────────────────────────────────────────────────────────────
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
  borderStrong: '#B6C8C5',
  shadow:       '0 1px 4px rgba(36,51,51,0.07)',
  shadowHover:  '0 3px 10px rgba(44,103,107,0.13)',
}

// ── Review status badge ──────────────────────────────────────────────────────────
const STATUS_STYLE = {
  NOT_STARTED:                          { label: 'Not Started',           color: '#8FA0A0', bg: 'transparent', border: '#8FA0A066' },
  DOCUMENT_UPLOADED_REVIEW_NOT_STARTED: { label: 'Documents Uploaded',    color: '#7AADAF', bg: 'transparent', border: '#7AADAF66' },
  AI_REVIEW_STARTED:                    { label: 'AI Review In Progress',  color: '#F0C080', bg: 'transparent', border: '#F0C08066' },
  AI_REVIEW_COMPLETED:                  { label: 'AI Review Completed',    color: '#7ECFA0', bg: 'transparent', border: '#7ECFA066' },
  HUMAN_REVIEW_COMPLETED:               { label: 'Human Review Completed', color: '#5B8DEF', bg: 'transparent', border: '#5B8DEF66' },
}

function ReviewStatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.NOT_STARTED
  return (
    <span style={{
      fontSize: '0.7rem',
      fontWeight: 600,
      color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: '20px',
      padding: '0.2rem 0.75rem',
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

// ── Answer value pill ────────────────────────────────────────────────────────────
function AnswerPill({ value, large }) {
  if (!value) return null
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
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  )
}

// ── Reviewer verdict badge ───────────────────────────────────────────────────────
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
      fontSize: '0.72rem',
      fontWeight: 600,
      color:           s.color,
      backgroundColor: s.bg,
      border:          `1px solid ${s.border}`,
      borderRadius: '6px',
      padding: '0.2rem 0.65rem',
      whiteSpace: 'nowrap',
      letterSpacing: '0.02em',
    }}>
      {s.label}
    </span>
  )
}

// ── Confirm submit modal ─────────────────────────────────────────────────────────
function ConfirmSubmitModal({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(24,36,36,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '420px',
        width: '90%',
        boxShadow: '0 8px 32px rgba(36,51,51,0.18)',
      }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: T.primaryDark, marginBottom: '0.75rem' }}>
          Submit Review
        </div>
        <p style={{ fontSize: '0.88rem', color: T.textSub, lineHeight: 1.65, margin: '0 0 1.5rem' }}>
          You are submitting the review.{' '}
          <strong>You won't be able to edit it any more</strong> — the questionnaire will be locked for human review.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem 1.25rem', fontSize: '0.88rem', fontWeight: 600,
              borderRadius: '8px', border: `1.5px solid ${T.border}`,
              backgroundColor: 'transparent', color: T.textSub, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1.25rem', fontSize: '0.88rem', fontWeight: 600,
              borderRadius: '8px', border: 'none',
              backgroundColor: T.primary, color: '#fff', cursor: 'pointer',
            }}
          >
            Confirm &amp; Submit
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Default answer entry ─────────────────────────────────────────────────────────
const DEFAULT_ENTRY = () => ({
  answer_value: null,
  answer_text:  null,
  answer_state: 'NOT_STARTED',
})

// ── YES/NO dropdown ──────────────────────────────────────────────────────────────
function YesNoDropdown({ value, onChange, disabled }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? T.bg : T.surface,
        color: value ? T.text : T.textMuted,
        border: `1.5px solid ${value ? T.primary : T.border}`,
        borderRadius: '6px',
        padding: '0.45rem 1rem',
        fontSize: '0.9rem',
        cursor: disabled ? 'default' : 'pointer',
        minWidth: '150px',
        outline: 'none',
        opacity: disabled ? 0.75 : 1,
      }}
    >
      <option value="">— Select —</option>
      <option value="YES">Yes</option>
      <option value="NO">No</option>
    </select>
  )
}

// ── Text textarea ────────────────────────────────────────────────────────────────
function TextAnswer({ value, onChange, disabled }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      placeholder="Enter your response…"
      rows={3}
      disabled={disabled}
      style={{
        width: '100%',
        backgroundColor: disabled ? T.bg : T.surface,
        color: T.text,
        border: `1.5px solid ${value ? T.primary : T.border}`,
        borderRadius: '6px',
        padding: '0.6rem 0.75rem',
        fontSize: '0.9rem',
        resize: disabled ? 'none' : 'vertical',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        lineHeight: 1.5,
        opacity: disabled ? 0.75 : 1,
      }}
    />
  )
}

// ── Question card ────────────────────────────────────────────────────────────────
function QuestionCard({ question, entry, onYesNoChange, onTextChange, llmAnswer, isSelected, onClick, isReadOnly }) {
  const { answer_value, answer_text, answer_state } = entry

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        zIndex: 1,
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
          color: '#fff',
          fontSize: '0.68rem',
          fontWeight: 700,
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          minWidth: '38px',
          textAlign: 'center',
          flexShrink: 0,
          marginTop: '2px',
        }}>
          {question.question_id}
        </span>
        <span style={{ fontSize: '0.92rem', color: T.text, lineHeight: 1.55, flex: 1 }}>
          {question.question_text}
          {question.mandatory_ind && (
            <span style={{ color: '#B94A48', marginLeft: '3px' }}>*</span>
          )}
        </span>
        {question.question_type === 'YES_NO' && llmAnswer && <AnswerPill value={llmAnswer.answer_value} />}
      </div>

      <div style={{ marginLeft: '50px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
        {question.question_type === 'YES_NO' ? (
          <YesNoDropdown
            value={answer_value}
            onChange={val => onYesNoChange(question.question_id, val)}
            disabled={isReadOnly}
          />
        ) : (
          <TextAnswer
            value={answer_text}
            onChange={text => onTextChange(question.question_id, text)}
            disabled={isReadOnly}
          />
        )}
        {llmAnswer?.answer_state && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {question.question_type !== 'YES_NO' && answer_state === 'DRAFT'
              ? (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#5B8DEF',
                  backgroundColor: '#EDF2FF',
                  border: '1px solid #5B8DEF44',
                  borderRadius: '6px',
                  padding: '0.2rem 0.65rem',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.02em',
                }}>
                  ✏ Human Edited
                </span>
              )
              : <ReviewerVerdictBadge verdict={llmAnswer.answer_state} />
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ── AI Review Panel ──────────────────────────────────────────────────────────────
function AIReviewPanel({ vendorId, selectedQuestion }) {
  const [loading, setLoading]   = useState(false)
  const [data, setData]         = useState(null)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!selectedQuestion) { setData(null); setError(null); return }
    const { questionaire_id, question_id } = selectedQuestion
    setLoading(true)
    setData(null)
    setError(null)

    fetch(`${API_BASE}/api/vendors/${vendorId}/answers/${questionaire_id}/${question_id}`)
      .then(r => {
        if (!r.ok) throw new Error(`No answer found (${r.status})`)
        return r.json()
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedQuestion, vendorId])

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (!selectedQuestion) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '0.75rem',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          backgroundColor: T.primaryPale,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem',
        }}>
          🤖
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: T.primaryDark }}>
          AI Review Assistant
        </div>
        <div style={{ fontSize: '0.82rem', color: T.textMuted, maxWidth: '200px', lineHeight: 1.6 }}>
          Select any question to view AI evidence
        </div>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ color: T.textMuted, fontSize: '0.88rem', fontStyle: 'italic' }}>
          Loading AI analysis…
        </span>
      </div>
    )
  }

  // ── Error / not yet reviewed ──────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: T.primaryDark }}>
          AI Review Assistant
        </div>
        <div style={{
          marginTop: '1rem',
          backgroundColor: '#FEF3E2',
          border: '1px solid #C97A2B44',
          borderRadius: '8px',
          padding: '0.85rem 1rem',
          fontSize: '0.82rem',
          color: '#C97A2B',
        }}>
          No AI review found for this question. Run Review first.
        </div>
      </div>
    )
  }

  // ── Data ──────────────────────────────────────────────────────────────────────
  if (!data) return null

  const confidence = data.confidence != null ? (parseFloat(data.confidence) * 100).toFixed(0) + '%' : '—'
  const citations  = Array.isArray(data.citations) ? data.citations : []

  return (
    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', overflowY: 'auto' }}>

      {/* Panel heading */}
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.primaryLight, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        AI Review Assistant
      </div>

      {/* Question text */}
      <div style={{
        backgroundColor: T.primaryGhost,
        borderRadius: '8px',
        padding: '0.85rem 1rem',
        fontSize: '0.87rem',
        color: T.text,
        lineHeight: 1.6,
        borderLeft: `3px solid ${T.primary}`,
      }}>
        {data.question_text}
      </div>

      {/* Answer badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '0.72rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Answer</span>
        <AnswerPill value={data.answer_value} large />
      </div>

      {/* Reviewer verdict */}
      {data.answer_state && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.68rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Reviewer Decision
          </span>
          <ReviewerVerdictBadge verdict={data.answer_state} />
        </div>
      )}

      {/* Rationale */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.68rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Rationale
        </span>
        <p style={{ margin: 0, fontSize: '0.85rem', color: T.textSub, lineHeight: 1.65 }}>
          {data.rationale || '—'}
        </p>
      </div>

      {/* Suggested action */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.68rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Suggested Action
        </span>
        <p style={{ margin: 0, fontSize: '0.85rem', color: T.textSub, lineHeight: 1.65 }}>
          {data.suggestion || '—'}
        </p>
      </div>

      {/* Confidence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '0.68rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Confidence
        </span>
        <span style={{
          fontSize: '0.82rem',
          fontWeight: 700,
          color: parseFloat(data.confidence) >= 0.7 ? '#2E8B57' : '#C97A2B',
        }}>
          {confidence}
        </span>
      </div>

      {/* Citations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.68rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          Citations
        </span>
        {citations.length === 0 ? (
          <span style={{ fontSize: '0.82rem', color: T.textMuted }}>None</span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {citations.map(c => (
              <span key={c} style={{
                fontSize: '0.73rem',
                fontWeight: 600,
                color: T.primary,
                backgroundColor: T.primaryGhost,
                border: `1px solid ${T.primaryPale}`,
                borderRadius: '5px',
                padding: '0.15rem 0.55rem',
                letterSpacing: '0.03em',
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

// ── Main page ────────────────────────────────────────────────────────────────────
function Questionnaire() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const vendorId  = state?.vendor_id || 'Unknown'

  const [questionnaires, setQuestionnaires]               = useState([])
  const [selectedId, setSelectedId]                       = useState(null)
  const [allQuestions, setAllQuestions]                   = useState({})
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(true)
  const [loadingQuestions, setLoadingQuestions]           = useState(false)
  const [answers, setAnswers]                             = useState({})
  const [reviewingTabs, setReviewingTabs]                 = useState({})
  const [llmAnswers, setLlmAnswers]                       = useState({})
  const [selectedQuestion, setSelectedQuestion]           = useState(null)
  const [reviewStatus, setReviewStatus]                   = useState('NOT_STARTED')
  const [submitting, setSubmitting]                       = useState(false)
  const [submitDone, setSubmitDone]                       = useState(false)
  const [submitError, setSubmitError]                     = useState(null)
  const [showConfirmModal, setShowConfirmModal]           = useState(false)
  const savedAnswersRef                                   = useRef(false)

  // ── Fetch vendor review status ────────────────────────────────────────────────
  useEffect(() => {
    if (!vendorId || vendorId === 'Unknown') return
    fetch(`${API_BASE}/vendors/${vendorId}`)
      .then(r => r.json())
      .then(data => setReviewStatus(data.review_status || 'NOT_STARTED'))
      .catch(console.error)
  }, [vendorId])

  // ── Fetch questionnaire list ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/questionnaires`)
      .then(r => r.json())
      .then(data => {
        const list = data.questionnaires || []
        setQuestionnaires(list)
        if (list.length > 0) setSelectedId(list[0].questionaire_id)
      })
      .catch(console.error)
      .finally(() => setLoadingQuestionnaires(false))
  }, [])

  // ── Pre-fetch ALL questions for ALL tabs ──────────────────────────────────────
  useEffect(() => {
    if (questionnaires.length === 0) return
    setLoadingQuestions(true)
    Promise.all(
      questionnaires.map(qn =>
        fetch(`${API_BASE}/questionnaires/${qn.questionaire_id}/questions`)
          .then(r => r.json())
          .then(data => ({ id: qn.questionaire_id, questions: data.questions || [] }))
      )
    )
      .then(results => {
        const qMap = {}, initialAnswers = {}
        results.forEach(({ id, questions }) => {
          qMap[id] = questions
          questions.forEach(q => { initialAnswers[`${id}#${q.question_id}`] = DEFAULT_ENTRY() })
        })
        setAllQuestions(qMap)
        setAnswers(initialAnswers)
      })
      .catch(console.error)
      .finally(() => setLoadingQuestions(false))
  }, [questionnaires])

  // ── Load saved answers when vendor is already in read-only state ─────────────
  useEffect(() => {
    const isReadOnly   = reviewStatus === 'HUMAN_REVIEW_COMPLETED'
    const isAIComplete = reviewStatus === 'AI_REVIEW_COMPLETED'
    if ((!isReadOnly && !isAIComplete) || questionnaires.length === 0 || Object.keys(allQuestions).length === 0) return
    if (savedAnswersRef.current) return
    savedAnswersRef.current = true

    Promise.all(
      questionnaires.map(qn =>
        fetch(`${API_BASE}/api/vendors/${vendorId}/answers/${qn.questionaire_id}`)
          .then(r => r.ok ? r.json() : { answers: [] })
          .then(data => ({ qnId: qn.questionaire_id, items: data.answers || [] }))
      )
    ).then(results => {
      const loadedAnswers    = {}
      const loadedLlmAnswers = {}
      results.forEach(({ qnId, items }) => {
        items.forEach(item => {
          const question_id = item.sort_key.split('#')[1]
          const key = `${qnId}#${question_id}`
          const q   = (allQuestions[qnId] || []).find(q => q.question_id === question_id)
          if (!q) return

          if (isReadOnly) {
            // HUMAN_REVIEW_COMPLETED — prefer human_value, lock as non-editable
            const displayVal = item.human_value != null ? item.human_value : (item.answer_value || '')
            if (q.question_type === 'YES_NO') {
              const norm = displayVal.toUpperCase()
              loadedAnswers[key] = { answer_value: (norm === 'YES' || norm === 'NO') ? norm : null, answer_text: null, answer_state: 'SUBMITTED' }
            } else {
              loadedAnswers[key] = { answer_value: null, answer_text: displayVal || null, answer_state: displayVal ? 'SUBMITTED' : 'NOT_STARTED' }
            }
          } else {
            // AI_REVIEW_COMPLETED — default fields with AI answer, keep editable
            const aiVal = item.answer_value || ''
            if (q.question_type === 'YES_NO') {
              const norm = aiVal.toUpperCase()
              const dropdownVal = (norm === 'YES' || norm === 'NO') ? norm : null
              loadedAnswers[key] = { answer_value: dropdownVal, answer_text: null, answer_state: dropdownVal ? 'AI_DEFAULT' : 'NOT_STARTED' }
            } else {
              loadedAnswers[key] = { answer_value: null, answer_text: aiVal || null, answer_state: aiVal ? 'AI_DEFAULT' : 'NOT_STARTED' }
            }
          }

          // Always populate AI Review panel data
          if (item.answer_value != null) {
            loadedLlmAnswers[key] = { answer_value: item.answer_value, answer_state: item.answer_state || null }
          }
        })
      })
      setAnswers(prev => ({ ...prev, ...loadedAnswers }))
      if (Object.keys(loadedLlmAnswers).length > 0) {
        setLlmAnswers(prev => ({ ...prev, ...loadedLlmAnswers }))
      }
    }).catch(console.error)
  }, [reviewStatus, questionnaires, allQuestions])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleYesNoChange = (questionId, val) => {
    const key = `${selectedId}#${questionId}`
    setAnswers(prev => ({ ...prev, [key]: { ...prev[key], answer_value: val, answer_state: val ? 'DRAFT' : 'NOT_STARTED' } }))
  }

  const handleTextChange = (questionId, text) => {
    const key = `${selectedId}#${questionId}`
    setAnswers(prev => ({ ...prev, [key]: { ...prev[key], answer_text: text, answer_state: text ? 'DRAFT' : 'NOT_STARTED' } }))
  }

  const getEntry = (questionId) => answers[`${selectedId}#${questionId}`] || DEFAULT_ENTRY()

  const handleRunReview = async (questionaireId) => {
    setReviewingTabs(prev => ({ ...prev, [questionaireId]: 'running' }))
    try {
      const resp = await fetch(
        `${API_BASE}/api/vendors/${vendorId}/run-questionaire/${questionaireId}`,
        { method: 'POST' }
      )
      if (!resp.ok) throw new Error(`API error ${resp.status}`)
      const data = await resp.json()
      const newLlmAnswers    = {}
      const newAnswerDefaults = {}
      ;(data.answers || []).forEach(a => {
        const key = `${questionaireId}#${a.question_id}`
        newLlmAnswers[key] = { answer_value: a.answer_value, answer_state: a.answer_state }

        // Default the dropdown / textarea with the AI answer
        const q = (allQuestions[questionaireId] || []).find(q => q.question_id === a.question_id)
        if (q) {
          if (q.question_type === 'YES_NO') {
            const normalized = a.answer_value?.toUpperCase()
            const dropdownVal = (normalized === 'YES' || normalized === 'NO') ? normalized : null
            newAnswerDefaults[key] = { answer_value: dropdownVal, answer_text: null, answer_state: dropdownVal ? 'AI_DEFAULT' : 'NOT_STARTED' }
          } else {
            const textVal = a.answer_value || null
            newAnswerDefaults[key] = { answer_value: null, answer_text: textVal, answer_state: textVal ? 'AI_DEFAULT' : 'NOT_STARTED' }
          }
        }
      })
      setLlmAnswers(prev => ({ ...prev, ...newLlmAnswers }))
      setAnswers(prev => ({ ...prev, ...newAnswerDefaults }))
      setReviewingTabs(prev => ({ ...prev, [questionaireId]: 'done' }))
      if (data.review_status) setReviewStatus(data.review_status)
    } catch (err) {
      console.error('Run review failed:', err)
      setReviewingTabs(prev => ({ ...prev, [questionaireId]: 'idle' }))
    }
  }

  const handleSubmit = async () => {
    setShowConfirmModal(false)
    setSubmitting(true)
    setSubmitError(null)
    try {
      for (const qn of questionnaires) {
        const qnQuestions    = allQuestions[qn.questionaire_id] || []
        const answersPayload = qnQuestions
          .map(q => {
            const key        = `${qn.questionaire_id}#${q.question_id}`
            const entry      = answers[key] || DEFAULT_ENTRY()
            const human_value = q.question_type === 'YES_NO'
              ? (entry.answer_value || '')
              : (entry.answer_text  || '')
            return { question_id: q.question_id, human_value }
          })
          .filter(a => a.human_value !== '')

        if (answersPayload.length === 0) continue

        const r = await fetch(`${API_BASE}/api/vendors/${vendorId}/submit-answers`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ questionaire_id: qn.questionaire_id, answers: answersPayload }),
        })
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(body.detail || `Submit failed (${r.status}) for ${qn.questionaire_id}`)
        }
      }

      // Lock the vendor record to HUMAN_REVIEW_COMPLETED
      const lockResp = await fetch(`${API_BASE}/api/vendors/${vendorId}/complete-review`, {
        method: 'POST',
      })
      if (!lockResp.ok) {
        const body = await lockResp.json().catch(() => ({}))
        // Log but don't block — local state is still authoritative
        console.error('complete-review failed:', body.detail || lockResp.status)
      }

      setReviewStatus('HUMAN_REVIEW_COMPLETED')
      savedAnswersRef.current = false // allow saved-answers effect to reload
      setSubmitDone(true)
    } catch (err) {
      console.error('Submit failed:', err)
      setSubmitError(err.message || 'Submission failed — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const currentQuestions = allQuestions[selectedId] || []
  const tabReviewState   = selectedId ? (reviewingTabs[selectedId] || 'idle') : 'idle'
  const isRunning        = tabReviewState === 'running'

  const totalMandatory = questionnaires.reduce((sum, qn) =>
    sum + (allQuestions[qn.questionaire_id] || []).filter(q => q.mandatory_ind).length, 0)

  const answeredMandatory = questionnaires.reduce((sum, qn) =>
    sum + (allQuestions[qn.questionaire_id] || []).filter(
      q => q.mandatory_ind && ['DRAFT', 'AI_DEFAULT'].includes(answers[`${qn.questionaire_id}#${q.question_id}`]?.answer_state)
    ).length, 0)

  const remainingMandatory  = totalMandatory - answeredMandatory
  const allMandatoryAnswered = totalMandatory > 0 && remainingMandatory === 0

  const isReadOnly   = reviewStatus === 'HUMAN_REVIEW_COMPLETED'
  const isTabComplete = (qnId) => {
    const qs = allQuestions[qnId] || []
    return qs.length > 0 && qs.filter(q => q.mandatory_ind).every(
      q => ['DRAFT', 'AI_DEFAULT'].includes(answers[`${qnId}#${q.question_id}`]?.answer_state)
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: T.bg }}>

      {/* ── Header band ──────────────────────────────────────────────────────── */}
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
          <div style={{ fontSize: '0.63rem', color: '#7AADAF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.15rem' }}>Vendor ID</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>{vendorId}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>TPRM Enterprise AI Assistant</div>
          <div style={{ fontSize: '0.78rem', color: '#7AADAF', marginTop: '2px' }}>Vendor Questionnaire</div>
          <div style={{ marginTop: '0.4rem' }}>
            <ReviewStatusBadge status={reviewStatus} />
          </div>
        </div>
        <a onClick={() => navigate('/rm-retrieve')} style={{ color: '#7AADAF', cursor: 'pointer', fontSize: '0.85rem' }}>← Back</a>
      </div>

      {/* ── Tab band ─────────────────────────────────────────────────────────── */}
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
        {loadingQuestionnaires ? (
          <span style={{ color: T.textMuted, fontSize: '0.85rem' }}>Loading…</span>
        ) : (
          questionnaires.map(qn => {
            const isActive = selectedId === qn.questionaire_id
            const complete = isTabComplete(qn.questionaire_id)
            return (
              <button
                key={qn.questionaire_id}
                onClick={() => { setSelectedId(qn.questionaire_id); setSelectedQuestion(null) }}
                style={{
                  padding: '0.35rem 1rem',
                  fontSize: '0.83rem',
                  borderRadius: '20px',
                  border: `1.5px solid ${isActive ? T.primary : complete ? '#2E8B5766' : T.border}`,
                  backgroundColor: isActive ? T.primary : complete ? '#EAF6EF' : 'transparent',
                  color: isActive ? '#fff' : complete ? '#2E8B57' : T.textSub,
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}
              >
                {complete && !isActive && <span style={{ fontSize: '0.65rem' }}>✓</span>}
                {qn.category}
              </button>
            )
          })
        )}
      </div>

      {/* ── Two-pane body ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left pane — 70% */}
        <div style={{
          width: '70%',
          overflowY: 'auto',
          backgroundColor: T.bg,
          padding: '1.75rem 2rem 1.5rem',
          borderRight: `1px solid ${T.border}`,
        }}>
          {loadingQuestions ? (
            <div style={{ textAlign: 'center', color: T.textMuted, padding: '4rem', fontSize: '0.95rem' }}>
              Loading questions…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* Run Review row — hidden after submission */}
              {!isReadOnly && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
                  {isRunning && (
                    <span style={{ fontSize: '0.82rem', color: T.textSub, fontStyle: 'italic' }}>
                      ⏳ Analyzing vendor documents…
                    </span>
                  )}
                  {(tabReviewState === 'done' || reviewStatus === 'AI_REVIEW_COMPLETED') && !isRunning && (
                    <span style={{ fontSize: '0.82rem', color: '#2E8B57' }}>✓ AI review complete</span>
                  )}
                  <button
                    disabled={isRunning}
                    onClick={() => handleRunReview(selectedId)}
                    style={{
                      padding: '0.45rem 1.25rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: `1.5px solid ${isRunning ? T.border : T.primary}`,
                      backgroundColor: isRunning ? T.surface : T.primary,
                      color: isRunning ? T.textMuted : '#fff',
                      cursor: isRunning ? 'not-allowed' : 'pointer',
                      transition: 'all 0.18s',
                    }}
                  >
                    {isRunning ? 'Running…' : (tabReviewState === 'done' || reviewStatus === 'AI_REVIEW_COMPLETED') ? 'Re-run Review' : 'Run Review'}
                  </button>
                </div>
              )}

              {/* Question cards */}
              {currentQuestions.map(q => (
                <QuestionCard
                  key={q.question_id}
                  question={q}
                  entry={getEntry(q.question_id)}
                  onYesNoChange={handleYesNoChange}
                  onTextChange={handleTextChange}
                  llmAnswer={llmAnswers[`${selectedId}#${q.question_id}`] || null}
                  isReadOnly={isReadOnly}
                  isSelected={selectedQuestion?.question_id === q.question_id && selectedQuestion?.questionaire_id === selectedId}
                  onClick={(e) => {
                    const tag = e.target.tagName
                    if (tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'OPTION') return
                    setSelectedQuestion({ questionaire_id: selectedId, question_id: q.question_id })
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right pane — 30% */}
        <div style={{
          width: '30%',
          backgroundColor: T.card,
          overflowY: 'auto',
          borderLeft: `1px solid ${T.border}`,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <AIReviewPanel vendorId={vendorId} selectedQuestion={selectedQuestion} />
        </div>
      </div>

      {/* ── Confirm submit modal ──────────────────────────────────────────────── */}
      {showConfirmModal && (
        <ConfirmSubmitModal
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      {!loadingQuestions && totalMandatory > 0 && (
        <div style={{
          backgroundColor: T.card,
          borderTop: `1px solid ${T.border}`,
          padding: '0.875rem 2rem',
          flexShrink: 0,
        }}>
          {(isReadOnly || submitDone) ? (
            /* ── Read-only footer: success banner + Go to Home ── */
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: '#2E8B57', fontWeight: 500 }}>
                ✓ Human review submitted — questionnaire is locked. Click any question card to view AI analysis.
              </span>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '0.55rem 1.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: `1.5px solid ${T.primary}`,
                  backgroundColor: 'transparent',
                  color: T.primary,
                  cursor: 'pointer',
                }}
              >
                Go to Home
              </button>
            </div>
          ) : (
            /* ── Editable footer: mandatory counter + Submit ── */
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              {submitError ? (
                <span style={{ fontSize: '0.8rem', color: '#B94A48', fontWeight: 500 }}>
                  ✕ {submitError}
                </span>
              ) : reviewStatus !== 'AI_REVIEW_COMPLETED' ? (
                <span style={{ fontSize: '0.8rem', color: T.textMuted }}>
                  AI Review must be completed on all sections before submitting
                </span>
              ) : !allMandatoryAnswered ? (
                <span style={{ fontSize: '0.8rem', color: T.textMuted }}>
                  <span style={{ color: '#B94A48', fontWeight: 600 }}>{remainingMandatory}</span>
                  {' '}mandatory question{remainingMandatory !== 1 ? 's' : ''} remaining
                </span>
              ) : (
                <span style={{ fontSize: '0.8rem', color: '#2E8B57', fontWeight: 500 }}>✓ All mandatory questions answered</span>
              )}
              <button
                disabled={reviewStatus !== 'AI_REVIEW_COMPLETED' || !allMandatoryAnswered || submitting}
                onClick={() => setShowConfirmModal(true)}
                style={{
                  marginLeft: 'auto',
                  padding: '0.55rem 1.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: (reviewStatus === 'AI_REVIEW_COMPLETED' && allMandatoryAnswered && !submitting) ? T.primary : T.border,
                  color: (reviewStatus === 'AI_REVIEW_COMPLETED' && allMandatoryAnswered && !submitting) ? '#fff' : T.textMuted,
                  cursor: (reviewStatus === 'AI_REVIEW_COMPLETED' && allMandatoryAnswered && !submitting) ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Questionnaire
