const MAX_DRAFTS = 10

function createCorrectionDraft(storage, clock = () => Date.now()) {
  let owner = ''
  const key = () => 'xingchengq:correctionDraft:' + owner
  const copy = value => JSON.parse(JSON.stringify(value))

  function read() {
    if (!owner) return []
    const value = storage.getStorageSync(key())
    if (!value || value.version !== 1 || value.owner !== owner || !Array.isArray(value.drafts)) return []
    return value.drafts.filter(item => item && item.questionId).map(copy)
  }

  return {
    bind(value) { owner = typeof value === 'string' ? value : '' },
    restore(questionId) {
      if (!owner || !questionId) return null
      const value = read().find(item => item.questionId === questionId)
      return value ? copy(value) : null
    },
    save(draft) {
      if (!owner) throw new Error('登录状态未就绪，请重新进入小程序')
      if (!draft || !draft.questionId) throw new Error('纠错草稿无效')
      const current = read().filter(item => item.questionId !== draft.questionId)
      const next = {
        questionId: String(draft.questionId),
        type: String(draft.type || ''),
        text: String(draft.text || ''),
        localPath: String(draft.localPath || ''),
        localSaved: Boolean(draft.localSaved),
        fileId: String(draft.fileId || ''),
        requestId: String(draft.requestId || ''),
        fingerprint: String(draft.fingerprint || ''),
        updatedAt: clock()
      }
      const combined = [next, ...current]
      const evicted = combined.slice(MAX_DRAFTS)
      storage.setStorageSync(key(), { version: 1, owner, drafts: combined.slice(0, MAX_DRAFTS) })
      return copy({ evicted })
    },
    clear(questionId) {
      if (!owner) return []
      const current = read()
      const removed = questionId ? current.filter(item => item.questionId === questionId) : current
      const kept = questionId ? current.filter(item => item.questionId !== questionId) : []
      if (kept.length) storage.setStorageSync(key(), { version: 1, owner, drafts: kept })
      else storage.removeStorageSync(key())
      return copy(removed)
    }
  }
}

let singleton
function current() {
  if (!singleton) singleton = createCorrectionDraft(wx)
  return singleton
}

module.exports = {
  createCorrectionDraft,
  bind: owner => current().bind(owner),
  restore: questionId => current().restore(questionId),
  save: draft => current().save(draft),
  clear: questionId => current().clear(questionId)
}
