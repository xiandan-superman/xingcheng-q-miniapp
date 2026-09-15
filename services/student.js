let accessRevision = 0
let returningToGate = false
function staleRequest() {
  const error = new Error('登录状态已变化，请重新进入')
  error.code = 'STALE_ACCOUNT_REQUEST'
  return error
}
function invalidateAccess() {
  accessRevision++
  require('./account-session').bind(null)
  require('./study-outbox').bind(null)
  require('./practice-draft').bind(null)
  require('./correction-draft').bind(null)
  for (const key of ['xingchengq:onboarded', 'xingchengq:devSkipGate']) {
    try { wx.removeStorageSync(key) } catch (e) {}
  }
}

function call(action, data = {}) {
  const revision = accessRevision
  return wx.cloud.callFunction({ name: 'student', data: { action, ...data } }).then((res) => {
    if (revision !== accessRevision) throw staleRequest()
    const result = res.result || { ok: false, error: { message: '云函数未返回数据' } }
    if (!result.ok) {
      const error = new Error((result.error && result.error.message) || '服务暂时不可用')
      error.code = result.error && result.error.code
      if (['ACCOUNT_UNAVAILABLE', 'NOT_WHITELISTED', 'AGREEMENT_REQUIRED', 'SUBJECT_REQUIRED'].includes(error.code)) {
        invalidateAccess()
        if (!returningToGate) {
          returningToGate = true
          setTimeout(() => wx.reLaunch({ url: '/pages/onboarding/index', complete: () => { returningToGate = false } }), 0)
        }
      }
      throw error
    }
    if (action === 'deleteAccount') {
      // Invalidate responses immediately; the page still needs the draft owner to remove saved attachments.
      accessRevision++
      require('./account-session').bind(null)
      require('./study-outbox').bind(null)
    }
    return result.data
  })
}

module.exports = {
  bootstrap: () => call('bootstrap'),
  agree: () => call('agree'),
  setSubjects: (subjectIds) => call('setSubjects', { subjectIds }),
  setProfile: (payload) => call('setProfile', payload),
  getDaily: () => call('dailyGet'),
  enterDaily: (dailyDate) => call('dailyEnter', dailyDate ? { dailyDate } : {}),
  submitDaily: (payload) => call('dailySubmit', payload),
  reviewDaily: (dailyDate) => call('dailyReview', dailyDate ? { dailyDate } : {}),
  answerGuide: (payload) => call('answerGuide', payload),
  getQuestionImages: (questionId) => call('questionImages', { questionId }),
  getCheckins: () => call('checkinCalendar'),
  getPracticeRecommendations: () => call('practiceRecommend'),
  startPractice: (payload) => call('practiceStart', { knowledgePointIds: (payload && payload.knowledgePointIds) || [], flowVersion: 2 }),
  preparePractice: (payload) => call('practicePrepare', payload),
  reviewPractice: (payload) => call('practiceReview', payload),
  submitPractice: (payload) => call('practiceSubmit', payload),
  getWrongBadge: () => call('wrongBadge'),
  listWrong: (filters) => call('wrongList', filters),
  enterWrong: (questionId) => call('wrongEnter', { questionId }),
  submitWrong: (payload) => call('wrongSubmit', payload),
  removeWrong: (questionId) => call('wrongRemove', { questionId }),
  excludeWrong: (questionId) => call('wrongExclude', { questionId }),
  submitCorrection: (payload) => call('correctionCreate', payload),
  listCorrections: (paging) => call('correctionMine', paging),
  useMakeup: (date) => call('makeup', { date }),
  getDashboard: (range) => call('dashboard', { range }),
  getReport: (range) => call('report', { range }),
  heartbeat: (payload) => call('heartbeat', payload),
  saveSubscription: (payload) => call('subscribeSave', payload),
  deleteAccount: () => call('deleteAccount')
}
