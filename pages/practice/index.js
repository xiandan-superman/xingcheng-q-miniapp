const accountSession = require('../../services/account-session')
const practiceDraft = require('../../services/practice-draft')
const api = require('../../services/student')
const uvToast = require('../../utils/uv-toast')
const view = require('../../services/presentation')
const { syncWrongDot } = require('../../utils/tab-badge')

const WAVE_KEY = 'xingchengq:practiceWaveDate'
const RESUME_KEY = 'xingchengq:practiceResumeSceneSession'

Page({
  data: {
    topPad: 80,
    reduceMotion: false,
    weakPoints: [],
    selectedCount: 0,
    loading: true,
    message: '',
    starting: false,
    canSelectMore: true,
    shake: false,
    plannedCount: 10,
    reviewSessionId: '',
    hasDraft: false,
    resumeMotion: 'still',
    qState: 'invite',
    qAccessory: 'none',
    qMotion: 'still',
    qPlayToken: 0
  },
  async onShow() {
    if (this._unloaded) return
    this._hidden = false
    const request = this._recommendationRequest = (this._recommendationRequest || 0) + 1
    clearTimeout(this._waveFb)
    uvToast.attach(this)
    const g = (getApp() && getApp().globalData) || {}
    this.setData({
      topPad: (g.statusBarHeight || 20) + Math.max(8, Math.round(((g.navBarHeight || 44) - 16) / 2)),
      reduceMotion: !!g.reduceMotion,
      reviewSessionId: accountSession.reviewSession(),
      qPlayToken: Date.now()
    })
    let draft = null
    try { draft = practiceDraft.restore() } catch (e) { view.error(e) }
    let resumeMotion = 'still'
    if (draft && !g.reduceMotion) {
      try {
        if (wx.getStorageSync(RESUME_KEY) !== draft.sessionId) {
          wx.setStorageSync(RESUME_KEY, draft.sessionId)
          resumeMotion = 'auto'
        }
      } catch (e) { view.error(e) }
    }
    this.setData({ hasDraft: !!draft, resumeMotion })
    const tabBar = this.getTabBar && this.getTabBar()
    if (tabBar) {
      tabBar.setData({ hidden: false })
      if (typeof tabBar.syncCurrentPage === 'function') tabBar.syncCurrentPage()
    }
    syncWrongDot(this)
    this.setData({ loading: true, message: '' })
    try {
      const data = await api.getPracticeRecommendations()
      if (request !== this._recommendationRequest) return
      const empty = !data.items.length
      const today = (require('../../services/presentation').dates(1) || [])[0] || new Date().toISOString().slice(0, 10)
      let qState = empty ? 'empty' : 'today-curious'
      let qAccessory = 'none'
      let qMotion = 'still'
      let qPlayToken = 0
      if (!empty && !g.reduceMotion) {
        const waved = wx.getStorageSync(WAVE_KEY)
        if (waved !== today) {
          wx.setStorageSync(WAVE_KEY, today)
          qAccessory = 'wave-invite'
          qMotion = 'auto'
          qPlayToken = Date.now()
          clearTimeout(this._waveFb)
          this._waveFb = setTimeout(() => {
            this.setData({ qAccessory: 'none', qState: 'today-curious', qMotion: 'auto' })
          }, 1600)
        }
      }
      this.setData({
        weakPoints: data.items.map(x => ({ id: x._id, name: x.name, selected: false })),
        selectedCount: 0,
        canSelectMore: true,
        message: empty ? '知识点题库补给中，发布后即可训练' : '',
        qState, qAccessory, qMotion, qPlayToken
      })
    } catch (e) {
      if (request !== this._recommendationRequest) return
      this.setData({ weakPoints: [], selectedCount: 0, canSelectMore: true, message: e.message || '知识点读取失败', qState: 'empty', qAccessory: 'none', qMotion: 'still' })
    } finally {
      if (request === this._recommendationRequest) this.setData({ loading: false })
    }
  },
  onHide() {
    this._hidden = true
    this._recommendationRequest = (this._recommendationRequest || 0) + 1
    this._navigating = false
    this._startRequest = (this._startRequest || 0) + 1
    clearTimeout(this._waveFb)
    clearTimeout(this._shakeTimer)
    this.setData({ starting: false })
    this.setData({ qAccessory: 'none', qMotion: 'still', qState: this.data.qState === 'transition' ? 'invite' : this.data.qState })
  },
  onUnload() {
    this.onHide()
    this._unloaded = true
  },
  onQPlayEnd(e) {
    if (this._hidden || this._unloaded) return
    const d = (e && e.detail) || {}
    if (d.accessory === 'wave-invite' || this.data.qAccessory === 'wave-invite') {
      clearTimeout(this._waveFb)
      this.setData({ qAccessory: 'none', qState: 'today-curious', qMotion: 'auto' })
    }
  },
  togglePoint(e) {
    if (this.data.loading || this.data.starting || this._navigating || this._hidden || this._unloaded) return
    const id = e.currentTarget.dataset.id
    const target = this.data.weakPoints.find((x) => x.id === id)
    if (!target) return
    if (!target.selected && this.data.selectedCount >= 3) {
      this.uvToast({ type: 'info', text: '一次校准 3 条星轨更稳' })
      this.setData({ shake: true })
      clearTimeout(this._shakeTimer)
      this._shakeTimer = setTimeout(() => this.setData({ shake: false }), 300)
      return
    }
    const list = this.data.weakPoints.map((x) => (x.id === id ? { ...x, selected: !x.selected } : x))
    const selectedCount = list.filter((x) => x.selected).length
    this.setData({ weakPoints: list, selectedCount, canSelectMore: selectedCount < 3 })
  },
  openPracticePage(url) {
    if (this._navigating || this._hidden || this._unloaded) return
    this._navigating = true
    wx.navigateTo({ url, fail: () => {
      this._navigating = false
      if (!this._hidden && !this._unloaded) view.error(new Error('页面打开失败，请重试'))
    } })
  },
  continuePractice() {
    if (this.data.starting || this._navigating || this._hidden || this._unloaded) return
    try {
      const session = practiceDraft.restore()
      if (!session) throw new Error('未找到可恢复的练习，请重新开始')
      getApp().globalData.practiceSession = session
      this.openPracticePage('/pages/quiz/index?scene=practice')
    } catch (e) { view.error(e) }
  },
  continueReview() {
    if (!this.data.reviewSessionId || this.data.starting) return
    this.openPracticePage('/pages/result/index?scene=practice&session=' + encodeURIComponent(this.data.reviewSessionId))
  },
  async start() {
    if (this.data.starting || this.data.loading || this._navigating || this._hidden || this._unloaded) return
    if (!this.data.selectedCount) {
      this.uvToast({ type: 'err', text: '先至少选一个薄弱点' })
      return
    }
    const knowledgePointIds = this.data.weakPoints.filter(x => x.selected).map(x => x.id)
    const request = this._startRequest = (this._startRequest || 0) + 1
    this.setData({ starting: true, qState: 'transition', qAccessory: 'none', qMotion: 'auto', qPlayToken: Date.now() })
    try {
      if (practiceDraft.restore()) {
        const confirmed = await new Promise(resolve => wx.showModal({ title: '开始新的练习？', content: '已有未完成的练习。开始新练习后将替换本机保存的草稿。', confirmText: '开始新的', cancelText: '保留草稿', success: r => resolve(r.confirm), fail: () => resolve(false) }))
        if (!confirmed || request !== this._startRequest) return
      }
      const session = await api.startPractice({ knowledgePointIds })
      if (request !== this._startRequest) return
      if (!session.questions.length) {
        this.setData({ qState: 'empty', qMotion: 'still' })
        throw new Error(session.message || '题目不足，正在补充')
      }
      if (session.status === 'insufficient' || session.message) {
        this.uvToast({ type: 'err', text: session.message || '题目不足，正在补充', dur: 2500 })
      }
      practiceDraft.start(session)
      getApp().globalData.practiceSession = { ...session, index: 0, results: [] }
      this.openPracticePage('/pages/quiz/index?scene=practice')
    } catch (e) { if (request === this._startRequest) view.error(e) } finally {
      if (request === this._startRequest) this.setData({ starting: false, qState: this.data.qState === 'empty' ? 'empty' : 'today-curious', qMotion: 'still', qAccessory: 'none' })
    }
  }
})
