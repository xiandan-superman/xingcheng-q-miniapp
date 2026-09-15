function createAccountSession(storage, globalData) {
  let owner = ''
  return {
    bind(value) {
      const next = typeof value === 'string' ? value : ''
      if (next !== owner) {
        globalData.practiceSession = null
        globalData.answerResult = null
      }
      owner = next
    },
    reviewSession() {
      return owner ? storage.getStorageSync('xingchengq:practiceReviewSession:' + owner) || '' : ''
    },
    saveReview(sessionId) {
      if (!owner) throw new Error('登录状态未就绪，请重新进入小程序')
      storage.setStorageSync('xingchengq:practiceReviewSession:' + owner, sessionId)
    }
  }
}
let singleton
function current() {
  if (!singleton) singleton = createAccountSession(wx, getApp().globalData)
  return singleton
}
module.exports = { createAccountSession, bind: owner => current().bind(owner), reviewSession: () => current().reviewSession(), saveReview: id => current().saveReview(id) }
