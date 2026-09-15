// Keep the immutable question set separate from the small, frequently saved answer draft.
function createPracticeDraft(storage) {
  let owner = ''
  const key = () => 'xingchengq:practiceDraft:' + owner
  const copy = value => JSON.parse(JSON.stringify(value))
  function read() {
    if (!owner) return null
    const value = storage.getStorageSync(key())
    if (!value || value.version !== 1 || value.owner !== owner || !value.sessionId) return null
    return copy(value)
  }
  return {
    bind(value) { owner = typeof value === 'string' ? value : '' },
    start(session) {
      if (!owner) throw new Error('登录状态未就绪，请重新进入小程序')
      if (!session || session.flowVersion !== 2 || !session.sessionId || !Array.isArray(session.questions) || !session.questions.length) throw new Error('练习会话无效')
      const previous = read()
      // Write the set first, then publish its active pointer. A failed write keeps the old draft recoverable.
      const setKey = key() + ':set:' + session.sessionId
      storage.setStorageSync(setKey, copy(session))
      storage.setStorageSync(key(), { version: 1, owner, sessionId: session.sessionId, index: 0, drafts: [], current: null })
      if (previous && previous.sessionId !== session.sessionId) storage.removeStorageSync(key() + ':set:' + previous.sessionId)
    },
    restore() {
      const state = read()
      if (!state) return null
      const session = storage.getStorageSync(key() + ':set:' + state.sessionId)
      if (!session || session.sessionId !== state.sessionId || session.flowVersion !== 2 || !Array.isArray(session.questions)) return null
      if (!Number.isInteger(state.index) || state.index < 0 || state.index >= session.questions.length || !Array.isArray(state.drafts)) return null
      const current = state.current && state.current.questionId === session.questions[state.index]._id ? state.current : null
      return { ...copy(session), index: state.index, drafts: state.drafts, current, results: [] }
    },
    save(sessionId, index, drafts, current) {
      const state = read()
      // A late page callback must not overwrite another account or a newly started set.
      if (!state || state.sessionId !== sessionId) return false
      storage.setStorageSync(key(), copy({ ...state, index, drafts, current }))
      return true
    },
    clear(sessionId) {
      const state = read()
      if (!state || state.sessionId !== sessionId) return
      storage.removeStorageSync(key())
      storage.removeStorageSync(key() + ':set:' + sessionId)
    }
  }
}
let singleton
function current() {
  if (!singleton) singleton = createPracticeDraft(wx)
  return singleton
}
module.exports = {
  createPracticeDraft,
  bind: owner => current().bind(owner),
  start: session => current().start(session),
  restore: () => current().restore(),
  save: (...args) => current().save(...args),
  clear: sessionId => current().clear(sessionId)
}
