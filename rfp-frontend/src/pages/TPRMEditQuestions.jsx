import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const EMPTY_QUESTION = {
  question_text: '',
  question_type: 'YES_NO',
  mandatory_ind: true,
  evidence_required: false,
  topic: '',
}

const EMPTY_CATEGORY = {
  questionaire_id: '',
  category: '',
  description: '',
  version: '1.0',
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#EEF2EF' },
  topbar: {
    backgroundColor: '#1C4548', padding: '1rem 2rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '3px solid #2C676B',
  },
  topbarLabel: { fontSize: '0.65rem', color: '#7AADAF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.15rem' },
  topbarTitle: { fontSize: '1.2rem', fontWeight: 700, color: '#fff' },
  topbarCenter: { fontSize: '0.95rem', fontWeight: 600, color: '#fff' },
  topbarBack: { color: '#7AADAF', cursor: 'pointer', fontSize: '0.85rem', background: 'none', border: 'none' },
  body: { flex: 1, padding: '2rem', maxWidth: 1100, margin: '0 auto', width: '100%' },

  tabBar: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' },
  tab: (active) => ({
    padding: '0.55rem 1.2rem', borderRadius: '8px 8px 0 0', border: '1.5px solid #2C676B',
    backgroundColor: active ? '#2C676B' : '#fff', color: active ? '#fff' : '#2C676B',
    cursor: 'pointer', fontWeight: active ? 700 : 500, fontSize: '0.9rem', transition: 'all 0.15s',
  }),
  newCatBtn: {
    marginLeft: 'auto', padding: '0.5rem 1.1rem', borderRadius: '8px',
    border: '1.5px solid #2C676B', backgroundColor: 'transparent', color: '#2C676B',
    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
  },

  panel: {
    backgroundColor: '#fff', borderRadius: '0 10px 10px 10px',
    border: '1.5px solid #C8D8D8', padding: '1.5rem',
    boxShadow: '0 2px 8px #2C676B10',
  },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' },
  panelTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1C4548', margin: 0 },
  panelDesc: { color: '#5A7070', fontSize: '0.88rem', marginTop: '0.2rem' },
  deleteCatBtn: {
    padding: '0.4rem 1rem', borderRadius: '6px', border: '1.5px solid #C0392B',
    backgroundColor: 'transparent', color: '#C0392B', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
  },

  // question row — normal / edited / pending-delete
  qRow: (isPendingDelete) => ({
    borderRadius: '8px',
    border: `1px solid ${isPendingDelete ? '#F5C6C6' : '#D8E4E4'}`,
    marginBottom: '0.75rem',
    backgroundColor: isPendingDelete ? '#FFF5F5' : '#F7F9F8',
    overflow: 'hidden',
    opacity: isPendingDelete ? 0.75 : 1,
    transition: 'all 0.2s',
  }),
  qRowHeader: {
    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem',
  },
  qId: { fontSize: '0.75rem', fontWeight: 700, color: '#2C676B', minWidth: 40 },
  qText: (isPendingDelete) => ({
    flex: 1, fontSize: '0.92rem', color: isPendingDelete ? '#A93226' : '#243333',
    fontWeight: 500, textDecoration: isPendingDelete ? 'line-through' : 'none',
  }),

  // badges
  badge: (bg, color) => ({
    fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '999px',
    backgroundColor: bg, color, border: `1px solid ${color}30`, whiteSpace: 'nowrap',
  }),

  iconBtn: (color, bg = 'transparent') => ({
    padding: '0.35rem 0.8rem', borderRadius: '6px', border: `1.5px solid ${color}`,
    backgroundColor: bg, color, cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem',
    whiteSpace: 'nowrap',
  }),
  undoBtn: {
    padding: '0.35rem 0.7rem', borderRadius: '6px', border: '1.5px solid #8AABAB',
    backgroundColor: 'transparent', color: '#5A7070', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem',
  },

  // inline edit / add form (no buttons)
  editForm: { padding: '1rem 1rem 1.2rem', borderTop: '1px solid #D8E4E4', backgroundColor: '#F0F5F5' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' },
  formFull: { gridColumn: '1 / -1' },
  label: { fontSize: '0.78rem', fontWeight: 600, color: '#3A5A5A', display: 'block', marginBottom: '0.3rem' },
  input: {
    width: '100%', padding: '0.5rem 0.7rem', borderRadius: '6px',
    border: '1.5px solid #C8D8D8', fontSize: '0.88rem', color: '#243333',
    backgroundColor: '#fff', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  },
  select: {
    width: '100%', padding: '0.5rem 0.7rem', borderRadius: '6px',
    border: '1.5px solid #C8D8D8', fontSize: '0.88rem', color: '#243333',
    backgroundColor: '#fff', boxSizing: 'border-box', outline: 'none',
  },
  textarea: {
    width: '100%', padding: '0.5rem 0.7rem', borderRadius: '6px',
    border: '1.5px solid #C8D8D8', fontSize: '0.88rem', color: '#243333',
    backgroundColor: '#fff', boxSizing: 'border-box', outline: 'none',
    resize: 'vertical', minHeight: 72, fontFamily: 'inherit',
  },
  checkRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' },
  checkLabel: { fontSize: '0.88rem', color: '#243333' },

  addQuestionBtn: {
    width: '100%', marginTop: '0.5rem', padding: '0.65rem',
    borderRadius: '8px', border: '1.5px dashed #2C676B',
    backgroundColor: 'transparent', color: '#2C676B', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
  },

  // new add-question row
  newQRow: {
    borderRadius: '8px', border: '1.5px dashed #2C676B', marginBottom: '0.75rem',
    backgroundColor: '#F0FAF5', overflow: 'hidden',
  },
  newQHeader: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.7rem 1rem', backgroundColor: '#E8F4F0',
  },

  // panel footer (Save / Reset)
  panelFooter: {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
    gap: '0.75rem', marginTop: '1.5rem',
    paddingTop: '1.25rem', borderTop: '1.5px solid #D8E4E4',
  },
  pendingHint: { flex: 1, fontSize: '0.82rem', color: '#8A6A00', fontStyle: 'italic' },
  saveBtn: (disabled) => ({
    padding: '0.6rem 1.8rem', borderRadius: '8px', border: 'none',
    backgroundColor: disabled ? '#A0BFC0' : '#2C676B',
    color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700, fontSize: '0.92rem', transition: 'background 0.15s',
  }),
  resetBtn: (disabled) => ({
    padding: '0.6rem 1.4rem', borderRadius: '8px',
    border: `1.5px solid ${disabled ? '#C8D8D8' : '#5A7070'}`,
    backgroundColor: 'transparent',
    color: disabled ? '#A0BFC0' : '#5A7070',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600, fontSize: '0.92rem',
  }),

  // modals
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(28,69,72,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '2rem',
    width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  modalTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1C4548', marginBottom: '1.25rem' },
  modalActions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' },
  cancelBtn: {
    padding: '0.5rem 1.1rem', borderRadius: '6px', border: '1.5px solid #8AABAB',
    backgroundColor: 'transparent', color: '#5A7070', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
  },
  modalSaveBtn: {
    padding: '0.5rem 1.3rem', borderRadius: '6px', border: 'none',
    backgroundColor: '#2C676B', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
  },
  deleteConfirmBtn: {
    padding: '0.5rem 1.3rem', borderRadius: '6px', border: 'none',
    backgroundColor: '#C0392B', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
  },

  errorBanner: {
    backgroundColor: '#FFF0EE', border: '1.5px solid #F5A89A', borderRadius: '8px',
    padding: '0.75rem 1rem', color: '#A93226', fontSize: '0.88rem', marginBottom: '1rem',
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuestionFields({ fields, onChange }) {
  return (
    <div style={s.formGrid}>
      <div style={s.formFull}>
        <label style={s.label}>Question Text *</label>
        <textarea
          style={s.textarea}
          value={fields.question_text}
          onChange={e => onChange('question_text', e.target.value)}
          placeholder="Enter the question…"
        />
      </div>
      <div>
        <label style={s.label}>Question Type</label>
        <select
          style={s.select}
          value={fields.question_type}
          onChange={e => onChange('question_type', e.target.value)}
        >
          <option value="YES_NO">YES / NO</option>
          <option value="TEXT">TEXT</option>
        </select>
      </div>
      <div>
        <label style={s.label}>Topic</label>
        <input
          style={s.input}
          value={fields.topic}
          onChange={e => onChange('topic', e.target.value)}
          placeholder="e.g. Data Retention"
        />
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', paddingTop: '0.5rem' }}>
        <label style={s.checkRow}>
          <input type="checkbox" checked={fields.mandatory_ind} onChange={e => onChange('mandatory_ind', e.target.checked)} />
          <span style={s.checkLabel}>Mandatory</span>
        </label>
        <label style={s.checkRow}>
          <input type="checkbox" checked={fields.evidence_required} onChange={e => onChange('evidence_required', e.target.checked)} />
          <span style={s.checkLabel}>Evidence Required</span>
        </label>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TPRMEditQuestions() {
  const navigate = useNavigate()

  const [questionnaires, setQuestionnaires] = useState([])
  const [selectedQId, setSelectedQId] = useState(null)
  const [questionsMap, setQuestionsMap] = useState({})
  const [loadingQ, setLoadingQ] = useState(false)
  const [pageError, setPageError] = useState(null)

  // Pending change state (per tab, cleared on tab switch)
  const [openEditIds, setOpenEditIds] = useState(new Set())   // expanded edit forms
  const [pendingEdits, setPendingEdits] = useState({})        // { questionId: fields }
  const [pendingAdds, setPendingAdds] = useState([])          // [{ tempId, fields }]
  const [pendingDeletes, setPendingDeletes] = useState(new Set())

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Category management
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCat, setNewCat] = useState(EMPTY_CATEGORY)
  const [catSaving, setCatSaving] = useState(false)
  const [catError, setCatError] = useState(null)

  // Delete confirmation (questions: pending; categories: immediate)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [catDeleting, setCatDeleting] = useState(false)
  const [catDeleteError, setCatDeleteError] = useState(null)

  // ── Computed ─────────────────────────────────────────────────────────────

  const currentQuestions = questionsMap[selectedQId] || []

  const hasPendingChanges =
    Object.keys(pendingEdits).length > 0 ||
    pendingAdds.length > 0 ||
    pendingDeletes.size > 0

  const pendingSummary = () => {
    const parts = []
    const editCount = Object.keys(pendingEdits).filter(id => !pendingDeletes.has(id)).length
    if (editCount > 0) parts.push(`${editCount} edited`)
    if (pendingAdds.length > 0) parts.push(`${pendingAdds.length} new`)
    if (pendingDeletes.size > 0) parts.push(`${pendingDeletes.size} to delete`)
    return parts.length ? `Unsaved changes: ${parts.join(', ')}` : ''
  }

  // ── Load questionnaires ──────────────────────────────────────────────────

  useEffect(() => {
    fetch(`${API}/questionnaires`)
      .then(r => r.json())
      .then(data => {
        const list = data.questionnaires || []
        setQuestionnaires(list)
        if (list.length > 0) setSelectedQId(list[0].questionaire_id)
      })
      .catch(() => setPageError('Failed to load questionnaire categories.'))
  }, [])

  // ── Load questions when tab changes ─────────────────────────────────────

  useEffect(() => {
    if (!selectedQId) return
    if (questionsMap[selectedQId] !== undefined) return
    setLoadingQ(true)
    fetch(`${API}/questionnaires/${selectedQId}/questions`)
      .then(r => {
        if (r.status === 404) return { questions: [] }
        return r.json()
      })
      .then(data => setQuestionsMap(prev => ({ ...prev, [selectedQId]: data.questions || [] })))
      .catch(() => setPageError('Failed to load questions.'))
      .finally(() => setLoadingQ(false))
  }, [selectedQId, questionsMap])

  // ── Tab switch ───────────────────────────────────────────────────────────

  function switchTab(qId) {
    setSelectedQId(qId)
    setOpenEditIds(new Set())
    setPendingEdits({})
    setPendingAdds([])
    setPendingDeletes(new Set())
    setSaveError(null)
  }

  // ── Edit question ────────────────────────────────────────────────────────

  function toggleEdit(q) {
    const qId = q.question_id
    if (openEditIds.has(qId)) {
      setOpenEditIds(prev => { const s = new Set(prev); s.delete(qId); return s })
    } else {
      if (!pendingEdits[qId]) {
        setPendingEdits(prev => ({
          ...prev,
          [qId]: {
            question_text: q.question_text,
            question_type: q.question_type,
            mandatory_ind: !!q.mandatory_ind,
            evidence_required: !!q.evidence_required,
            topic: q.topic || '',
          },
        }))
      }
      setOpenEditIds(prev => new Set([...prev, qId]))
    }
  }

  function editFieldChange(questionId, key, val) {
    setPendingEdits(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], [key]: val },
    }))
  }

  // ── Add question ─────────────────────────────────────────────────────────

  function addNewForm() {
    const tempId = `temp_${Date.now()}`
    setPendingAdds(prev => [...prev, { tempId, fields: { ...EMPTY_QUESTION } }])
  }

  function addFieldChange(tempId, key, val) {
    setPendingAdds(prev =>
      prev.map(a => a.tempId === tempId ? { ...a, fields: { ...a.fields, [key]: val } } : a)
    )
  }

  function removeAddForm(tempId) {
    setPendingAdds(prev => prev.filter(a => a.tempId !== tempId))
  }

  // ── Mark for deletion ────────────────────────────────────────────────────

  function askMarkDelete(q) {
    setConfirmDelete({
      type: 'question',
      questionId: q.question_id,
      label: `"${q.question_text.slice(0, 80)}${q.question_text.length > 80 ? '…' : ''}"`,
    })
  }

  function confirmMarkDelete() {
    setPendingDeletes(prev => new Set([...prev, confirmDelete.questionId]))
    setOpenEditIds(prev => { const s = new Set(prev); s.delete(confirmDelete.questionId); return s })
    setConfirmDelete(null)
  }

  function undoDelete(questionId) {
    setPendingDeletes(prev => { const s = new Set(prev); s.delete(questionId); return s })
  }

  // ── Delete category (immediate) ──────────────────────────────────────────

  function askDeleteCategory(qn) {
    setCatDeleteError(null)
    setConfirmDelete({ type: 'category', qId: qn.questionaire_id, label: qn.category })
  }

  async function confirmCategoryDelete() {
    setCatDeleting(true)
    setCatDeleteError(null)
    try {
      const res = await fetch(`${API}/questionnaires/${confirmDelete.qId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      const remaining = questionnaires.filter(q => q.questionaire_id !== confirmDelete.qId)
      setQuestionnaires(remaining)
      if (selectedQId === confirmDelete.qId) switchTab(remaining[0]?.questionaire_id || null)
      setConfirmDelete(null)
    } catch {
      setCatDeleteError('Failed to delete category. Please try again.')
    } finally {
      setCatDeleting(false)
    }
  }

  // ── Save all pending changes ─────────────────────────────────────────────

  async function saveAll() {
    // Validate pending adds
    const invalidAdd = pendingAdds.find(a => !a.fields.question_text.trim())
    if (invalidAdd) {
      setSaveError('All new questions must have question text before saving.')
      return
    }

    setSaving(true)
    setSaveError(null)
    const errors = []

    // 1. Deletes
    for (const questionId of pendingDeletes) {
      try {
        const res = await fetch(
          `${API}/questionnaires/${selectedQId}/questions/${questionId}`,
          { method: 'DELETE' }
        )
        if (!res.ok) errors.push(`Failed to delete ${questionId}`)
      } catch {
        errors.push(`Network error deleting ${questionId}`)
      }
    }

    // 2. Edits (skip questions also marked for delete)
    for (const [questionId, fields] of Object.entries(pendingEdits)) {
      if (pendingDeletes.has(questionId)) continue
      try {
        const res = await fetch(
          `${API}/questionnaires/${selectedQId}/questions/${questionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
          }
        )
        if (!res.ok) errors.push(`Failed to update ${questionId}`)
      } catch {
        errors.push(`Network error updating ${questionId}`)
      }
    }

    // 3. Adds
    for (const { fields } of pendingAdds) {
      try {
        const res = await fetch(`${API}/questionnaires/${selectedQId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        })
        if (!res.ok) errors.push('Failed to add a new question')
      } catch {
        errors.push('Network error adding a new question')
      }
    }

    if (errors.length > 0) {
      setSaveError(errors.join(' · '))
      setSaving(false)
      return
    }

    // Success — clear pending state and re-fetch from DB
    setOpenEditIds(new Set())
    setPendingEdits({})
    setPendingAdds([])
    setPendingDeletes(new Set())
    setQuestionsMap(prev => { const n = { ...prev }; delete n[selectedQId]; return n })
    setSaving(false)
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  function resetAll() {
    setOpenEditIds(new Set())
    setPendingEdits({})
    setPendingAdds([])
    setPendingDeletes(new Set())
    setSaveError(null)
    // Force re-fetch by removing from questionsMap
    setQuestionsMap(prev => { const n = { ...prev }; delete n[selectedQId]; return n })
  }

  // ── Create new category ──────────────────────────────────────────────────

  async function saveNewCategory() {
    if (!newCat.questionaire_id.trim() || !newCat.category.trim()) {
      setCatError('Category ID and Category Name are required.')
      return
    }
    setCatSaving(true)
    setCatError(null)
    try {
      const res = await fetch(`${API}/questionnaires`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Create failed')
      }
      const created = await res.json()
      setQuestionnaires(prev => [...prev, created])
      setQuestionsMap(prev => ({ ...prev, [created.questionaire_id]: [] }))
      switchTab(created.questionaire_id)
      setShowNewCat(false)
      setNewCat(EMPTY_CATEGORY)
    } catch (e) {
      setCatError(e.message)
    } finally {
      setCatSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const selectedQn = questionnaires.find(q => q.questionaire_id === selectedQId)

  return (
    <div style={s.page}>
      {/* Top bar */}
      <div style={s.topbar}>
        <div>
          <div style={s.topbarLabel}>TPRM User</div>
          <div style={s.topbarTitle}>Edit Questions</div>
        </div>
        <div style={s.topbarCenter}>TPRM Enterprise AI Assistant</div>
        <button style={s.topbarBack} onClick={() => navigate('/tprm')}>← Back</button>
      </div>

      <div style={s.body}>
        {pageError && <div style={s.errorBanner}>{pageError}</div>}

        {/* Tab bar */}
        <div style={s.tabBar}>
          {questionnaires.map(qn => (
            <button
              key={qn.questionaire_id}
              style={s.tab(qn.questionaire_id === selectedQId)}
              onClick={() => switchTab(qn.questionaire_id)}
            >
              {qn.category}
            </button>
          ))}
          <button style={s.newCatBtn} onClick={() => { setShowNewCat(true); setCatError(null) }}>
            + New Category
          </button>
        </div>

        {/* Category panel */}
        {selectedQn && (
          <div style={s.panel}>
            {/* Panel header */}
            <div style={s.panelHeader}>
              <div>
                <div style={s.panelTitle}>{selectedQn.category}</div>
                <div style={s.panelDesc}>{selectedQn.description}</div>
                <div style={{ ...s.panelDesc, marginTop: '0.15rem', fontSize: '0.78rem' }}>
                  ID: {selectedQn.questionaire_id} &nbsp;·&nbsp; v{selectedQn.version}
                </div>
              </div>
              <button style={s.deleteCatBtn} onClick={() => askDeleteCategory(selectedQn)}>
                Delete Category
              </button>
            </div>

            {/* Question list */}
            {loadingQ ? (
              <div style={{ color: '#5A7070', fontSize: '0.9rem', padding: '0.5rem 0' }}>Loading questions…</div>
            ) : (
              <>
                {currentQuestions.length === 0 && pendingAdds.length === 0 && (
                  <div style={{ color: '#8AABAB', fontSize: '0.9rem', padding: '0.5rem 0', textAlign: 'center' }}>
                    No questions yet. Add one below.
                  </div>
                )}

                {currentQuestions.map(q => {
                  const isOpen = openEditIds.has(q.question_id)
                  const isPendingDelete = pendingDeletes.has(q.question_id)
                  const isEdited = pendingEdits[q.question_id] !== undefined && !isPendingDelete
                  const displayFields = pendingEdits[q.question_id] || q

                  return (
                    <div key={q.question_id} style={s.qRow(isPendingDelete)}>
                      <div style={s.qRowHeader}>
                        <span style={s.qId}>{q.question_id}</span>
                        <span style={s.qText(isPendingDelete)}>
                          {isEdited ? displayFields.question_text : q.question_text}
                        </span>

                        {/* Status badges */}
                        {isPendingDelete && (
                          <span style={s.badge('#FDECEA', '#A93226')}>Pending Delete</span>
                        )}
                        {isEdited && !isPendingDelete && (
                          <span style={s.badge('#FFF8E1', '#8A6A00')}>Edited</span>
                        )}
                        {!isPendingDelete && (
                          <span style={s.badge(
                            displayFields.question_type === 'YES_NO' ? '#E8F4F0' : '#EEF2EF',
                            displayFields.question_type === 'YES_NO' ? '#2C676B' : '#5A7070'
                          )}>
                            {displayFields.question_type === 'YES_NO' ? 'YES/NO' : 'TEXT'}
                          </span>
                        )}
                        {!isPendingDelete && displayFields.mandatory_ind && (
                          <span style={s.badge('#E8EEF4', '#1C4548')}>Mandatory</span>
                        )}

                        {/* Action buttons */}
                        {isPendingDelete ? (
                          <button style={s.undoBtn} onClick={() => undoDelete(q.question_id)}>
                            Undo
                          </button>
                        ) : (
                          <>
                            <button
                              style={s.iconBtn(isOpen ? '#5A7070' : '#2C676B')}
                              onClick={() => toggleEdit(q)}
                            >
                              {isOpen ? 'Close' : 'Edit'}
                            </button>
                            <button style={s.iconBtn('#C0392B')} onClick={() => askMarkDelete(q)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>

                      {/* Inline edit form — no Save/Cancel */}
                      {isOpen && !isPendingDelete && (
                        <div style={s.editForm}>
                          <QuestionFields
                            fields={displayFields}
                            onChange={(key, val) => editFieldChange(q.question_id, key, val)}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Pending add forms */}
                {pendingAdds.map(({ tempId, fields }) => (
                  <div key={tempId} style={s.newQRow}>
                    <div style={s.newQHeader}>
                      <span style={{ ...s.qId, color: '#2C676B' }}>NEW</span>
                      <span style={{ flex: 1, fontSize: '0.82rem', color: '#3A7A5A', fontStyle: 'italic' }}>
                        New question (unsaved)
                      </span>
                      <button style={s.iconBtn('#C0392B')} onClick={() => removeAddForm(tempId)}>
                        Remove
                      </button>
                    </div>
                    <div style={s.editForm}>
                      <QuestionFields
                        fields={fields}
                        onChange={(key, val) => addFieldChange(tempId, key, val)}
                      />
                    </div>
                  </div>
                ))}

                {/* Add question button */}
                <button style={s.addQuestionBtn} onClick={addNewForm}>
                  + Add Question
                </button>
              </>
            )}

            {/* ── Panel footer: single Save + Reset ── */}
            <div style={s.panelFooter}>
              {hasPendingChanges && (
                <span style={s.pendingHint}>{pendingSummary()}</span>
              )}
              {saveError && (
                <span style={{ fontSize: '0.82rem', color: '#A93226' }}>{saveError}</span>
              )}
              <button
                style={s.resetBtn(!hasPendingChanges || saving)}
                onClick={resetAll}
                disabled={!hasPendingChanges || saving}
              >
                Reset
              </button>
              <button
                style={s.saveBtn(!hasPendingChanges || saving)}
                onClick={saveAll}
                disabled={!hasPendingChanges || saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {questionnaires.length === 0 && !pageError && (
          <div style={{ textAlign: 'center', color: '#5A7070', marginTop: '3rem' }}>
            No categories found. Create one to get started.
          </div>
        )}
      </div>

      {/* ── New Category Modal ── */}
      {showNewCat && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowNewCat(false) }}>
          <div style={s.modal}>
            <div style={s.modalTitle}>Create New Category</div>
            {catError && <div style={s.errorBanner}>{catError}</div>}
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={s.label}>
                Category ID * <span style={{ color: '#8AABAB', fontWeight: 400 }}>(e.g. VENDOR_RISK)</span>
              </label>
              <input
                style={s.input}
                value={newCat.questionaire_id}
                onChange={e => setNewCat(p => ({ ...p, questionaire_id: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                placeholder="DATA_PRIVACY"
              />
            </div>
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={s.label}>Category Name *</label>
              <input
                style={s.input}
                value={newCat.category}
                onChange={e => setNewCat(p => ({ ...p, category: e.target.value }))}
                placeholder="e.g. Vendor Risk"
              />
            </div>
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={s.label}>Description</label>
              <textarea
                style={{ ...s.textarea, minHeight: 60 }}
                value={newCat.description}
                onChange={e => setNewCat(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of this questionnaire category"
              />
            </div>
            <div>
              <label style={s.label}>Version</label>
              <input
                style={{ ...s.input, maxWidth: 120 }}
                value={newCat.version}
                onChange={e => setNewCat(p => ({ ...p, version: e.target.value }))}
                placeholder="1.0"
              />
            </div>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => { setShowNewCat(false); setNewCat(EMPTY_CATEGORY) }} disabled={catSaving}>
                Cancel
              </button>
              <button style={s.modalSaveBtn} onClick={saveNewCategory} disabled={catSaving}>
                {catSaving ? 'Creating…' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {confirmDelete && (
        <div style={s.overlay}>
          <div style={s.modal}>
            {confirmDelete.type === 'question' ? (
              <>
                <div style={s.modalTitle}>Mark Question for Deletion?</div>
                <p style={{ color: '#5A7070', fontSize: '0.92rem', margin: '0 0 0.5rem' }}>
                  {confirmDelete.label} will be marked for deletion.
                </p>
                <p style={{ color: '#8A6A00', fontSize: '0.85rem', margin: 0 }}>
                  The question won't be removed until you click <strong>Save</strong>. You can undo this before saving.
                </p>
                <div style={s.modalActions}>
                  <button style={s.cancelBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
                  <button style={s.deleteConfirmBtn} onClick={confirmMarkDelete}>Mark for Deletion</button>
                </div>
              </>
            ) : (
              <>
                <div style={s.modalTitle}>Delete Category?</div>
                {catDeleteError && <div style={s.errorBanner}>{catDeleteError}</div>}
                <p style={{ color: '#5A7070', fontSize: '0.92rem', margin: '0 0 0.5rem' }}>
                  Are you sure you want to delete the category <strong>{confirmDelete.label}</strong>?
                </p>
                <p style={{ color: '#A93226', fontSize: '0.85rem', margin: 0 }}>
                  This takes effect immediately. Existing vendor answers linked to this category are preserved in the database.
                </p>
                <div style={s.modalActions}>
                  <button style={s.cancelBtn} onClick={() => setConfirmDelete(null)} disabled={catDeleting}>Cancel</button>
                  <button style={s.deleteConfirmBtn} onClick={confirmCategoryDelete} disabled={catDeleting}>
                    {catDeleting ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
