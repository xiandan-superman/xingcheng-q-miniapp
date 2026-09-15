const api = require('../../services/student')
const view = require('../../services/presentation')
const { syncWrongDot } = require('../../utils/tab-badge')
const correctionDraft = require('../../services/correction-draft')
const REMINDER_TIME_SLOTS = ['07:00', '10:00', '18:00', '22:00']
const normalizeReminderTime = (value) => value || '20:30'
Page({
  data: {
    topPad: 80,
    nickname: '星橙学生',
    reduceMotion: false,
    remind: false,
    reminderTime: '20:30',
    timeSlots: REMINDER_TIME_SLOTS,
    reminderSuccess: false,
    showCorrections: false,
    correctionsOffset: 0,
    correctionsTracking: false,
    correctionsList: [],
    correctionsLoading: false,
    correctionsHasMore: false,
    correctionsPage: 0,
    metrics: [
      { num: '—', label: '累计答题' },
      { num: '—', label: '星轨稳定度' },
      { num: '—', label: '跃迁时长' },
      { num: '—', label: '连续星能' },
      { num: '—', label: '累计打卡' }
    ],
    weakPoints: [],
    trendValues: [],
    accuracy: 0,
    subjectText: '',
    trendDays: [],
    message: '',
    qState: 'rest',
    qMotion: 'still',
    qPlayToken: 0
  },

  async onShow() {
    if (this._unloaded) return
    this._hidden = false
    const revision = this._profileRevision = (this._profileRevision || 0) + 1
    const g = (getApp() && getApp().globalData) || {}
    this.setData({
      topPad: (g.statusBarHeight || 20) + (g.navBarHeight || 44) + 4,
      nickname: wx.getStorageSync('xingchengq:nickname') || '星橙学生',
      reduceMotion: Boolean(wx.getStorageSync('xingchengq:reduceMotion')),
      remind: (wx.getStorageSync('xingchengq:remind') !== false),
      reminderTime: normalizeReminderTime(wx.getStorageSync('xingchengq:reminderTime')),
      correctionsList: wx.getStorageSync('xingchengq:corrections') || [],
      qState: getApp().globalData.reduceMotion ? 'rest' : 'today-curious',
      qMotion: getApp().globalData.reduceMotion ? 'still' : 'auto',
      qPlayToken: Date.now()
    })
    const tabBar = this.getTabBar && this.getTabBar()
    if (tabBar) {
      tabBar.setData({ hidden: false })
      if (typeof tabBar.syncCurrentPage === 'function') tabBar.syncCurrentPage()
    }
    syncWrongDot(this)
    if (wx.getStorageSync('xingchengq:shareSuccessJump')) {
      wx.removeStorageSync('xingchengq:shareSuccessJump')
      this._shareReturnTimer = setTimeout(() => { if (!this._hidden && !this._unloaded) this.playShareSuccessJump() }, 200)
    }
    try {
      const [profile, all, week, checkins] = await Promise.all([api.bootstrap(), api.getDashboard('all'), api.getDashboard('7'), api.getCheckins()])
      if (revision !== this._profileRevision) return
      getApp().globalData.reminderTemplateId = profile.reminderTemplateId || ''
      const days = view.dates()
      const map = Object.fromEntries((week.trend || []).map(x => [x.date, x]))
      // 无提交日不记成 0%，避免折线贴底却角标 100%
      const trendValues = days.map((d) => {
        const t = map[d]
        if (t && t.submitCount) return Math.round(t.correctCount * 100 / t.submitCount)
        return null
      })
      const reminderTime = profile.user.reminderHm || '20:30'
      this.setData({ nickname: profile.user.nickname, remind: profile.user.subscribeOk, reminderTime,
        subjectText: (profile.user.selectedSubjectIds || []).map(x => view.subjects[x] || x).join(' / '),
        accuracy: week.accuracy, message: '',
        metrics: [{ num: all.total, label: '累计答题' }, { num: all.accuracy + '%', label: '星轨稳定度' }, { num: (all.durationMs / 3600000).toFixed(1) + 'h', label: '跃迁时长' }, { num: checkins.streak, label: '连续星能' }, { num: checkins.total, label: '累计打卡' }],
        weakPoints: (all.weakPoints || []).map(x => ({ name: x.name, count: x.wrongCount, v: Math.round(x.wrongCount * 100 / Math.max(1, all.total - all.correct)) })),
        trendDays: days.map(x => x.slice(5)), trendValues
      }, () => this.drawTrend())
      return
    } catch (e) { if (revision === this._profileRevision) { this.setData({ message: e.message }); view.error(e) } }
  },

  drawTrend() {
    if (this._hidden || this._unloaded) return
    if (!wx.createSelectorQuery) return
    wx.createSelectorQuery().select('#trendCanvas').fields({ node: true, size: true }).exec((res) => {
      if (this._hidden || this._unloaded) return
      const info = res && res[0]
      if (!info || !info.node) {
        // 节点未就绪，重试一次
        this._trendRetry = setTimeout(() => { if (!this._hidden && !this._unloaded) this.doDraw() }, 120)
        return
      }
      this.doDraw(info)
    })
  },

  doDraw(info) {
    if (this._hidden || this._unloaded) return
    if (!info) {
      wx.createSelectorQuery().select('#trendCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!this._hidden && !this._unloaded && res && res[0] && res[0].node) this.paint(res[0])
      })
      return
    }
    this.paint(info)
  },

  paint(info) {
    if (this._hidden || this._unloaded) return
    const canvas = info.node
    const ctx = canvas.getContext('2d')
    const system = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const dpr = system.pixelRatio || 1
    const width = info.width
    const height = info.height
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    // 网格虚线
    ctx.strokeStyle = '#E9E2CE'
    ctx.lineWidth = 1
    ;[height * .3, height * .65].forEach((y) => {
      ctx.beginPath(); ctx.setLineDash([4, 5])
      ctx.moveTo(6, y); ctx.lineTo(width - 6, y); ctx.stroke()
    })
    ctx.setLineDash([])

    const values = this.data.trendValues || []
    if (!values.length) return
    const points = values.map((value, i) => {
      const x = 8 + i * (width - 16) / Math.max(1, values.length - 1)
      if (value == null || value === '') return { x, y: null, v: null }
      const v = Math.min(100, Math.max(0, Number(value) || 0))
      return { x, y: height - 14 - (v / 100) * (height - 30), v }
    })
    const defined = points.filter((p) => p.y != null)
    if (!defined.length) return
    // 填充与折线采用相同连续区间，无作答日期不补画数据。
    const fill = ctx.createLinearGradient(0, 0, 0, height)
    fill.addColorStop(0, 'rgba(255,138,42,.22)')
    fill.addColorStop(1, 'rgba(255,138,42,0)')
    let segment = []
    const fillSegment = () => {
      if (segment.length > 1) {
        ctx.beginPath()
        ctx.moveTo(segment[0].x, height - 6)
        segment.forEach(p => ctx.lineTo(p.x, p.y))
        ctx.lineTo(segment[segment.length - 1].x, height - 6)
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill()
      }
      segment = []
    }
    points.forEach(p => { if (p.y == null) fillSegment(); else segment.push(p) })
    fillSegment()
    // 折线：无数据日断开，避免当成 0% 贴底
    ctx.beginPath()
    let started = false
    points.forEach((p) => {
      if (p.y == null) { started = false; return }
      if (!started) { ctx.moveTo(p.x, p.y); started = true }
      else ctx.lineTo(p.x, p.y)
    })
    ctx.strokeStyle = '#FF8A2A'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    ctx.stroke()
    // 节点（有数据才画；末个有数据点用荧光黄）
    const lastDef = defined[defined.length - 1]
    points.forEach((p) => {
      if (p.y == null) return
      ctx.beginPath()
      ctx.arc(p.x, p.y, p === lastDef ? 6 : 3.5, 0, Math.PI * 2)
      ctx.fillStyle = p === lastDef ? '#F8FF63' : '#fff'
      ctx.fill()
      ctx.strokeStyle = '#FF8A2A'
      ctx.lineWidth = 2
      ctx.stroke()
    })
  },

  onHide() {
    this._hidden = true
    this._profileRevision = (this._profileRevision || 0) + 1
    clearTimeout(this._trendRetry)
    clearTimeout(this._shareReturnTimer)
    clearTimeout(this._jumpFb)
    this.setData({ qState: 'rest', qMotion: 'still' })
  },

  onUnload() { this.onHide(); this._unloaded = true; clearTimeout(this._reminderSuccessTimer) },

  onQPlayEnd() {
    if (this.data.qState === 'happy-jump') {
      this.setData({ qState: 'rest', qMotion: 'still' })
    }
  },

  /** 分享成功：happy-jump 一次（报告页返回或生成星光卡成功时可调） */
  playShareSuccessJump() {
    if (this.data.reduceMotion) return
    this.setData({ qState: 'wink', qMotion: 'auto', qPlayToken: Date.now() })
    clearTimeout(this._jumpFb)
    this._jumpFb = setTimeout(() => this.setData({ qState: 'today-curious', qMotion: 'auto', qPlayToken: Date.now() }), 1300)
  },

  editProfile() {
    wx.showModal({
      title: '编辑星籍昵称',
      editable: true,
      placeholderText: '输入你的星航代号',
      content: this.data.nickname === '星橙学生' ? '' : this.data.nickname,
      success: async (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const nickname = res.content.trim().slice(0, 12)
          try { await api.setProfile({ nickname }); wx.setStorageSync('xingchengq:nickname', nickname); this.setData({ nickname }) } catch (e) { view.error(e) }
        }
      }
    })
  },

  toggleMotion() {
    const reduceMotion = !this.data.reduceMotion
    wx.setStorageSync('xingchengq:reduceMotion', reduceMotion)
    const app = getApp()
    if (app && app.globalData) app.globalData.reduceMotion = reduceMotion
    this.setData({ reduceMotion })
    // tabBar 不在页面节点树内，需单独同步，否则它仍会继续播放选中弹跳
    const tabBar = this.getTabBar && this.getTabBar()
    if (tabBar && typeof tabBar.setReduceMotion === 'function') tabBar.setReduceMotion(reduceMotion)
  },

  async toggleRemind() {
    if (this._remindSaving) return
    this._remindSaving = true
    const previous = this.data.remind
    const remind = !previous
    try {
      if (remind) {
        const templateId = getApp().globalData.reminderTemplateId
        if (!templateId) throw new Error('提醒服务尚未配置，暂时无法开启')
        const result = await wx.requestSubscribeMessage({ tmplIds: [templateId] })
        if (result[templateId] !== 'accept') throw new Error('未获得订阅授权')
      }
      await api.saveSubscription({ subscribeOk: remind }); this.setData({ remind, reminderSuccess: remind })
      if (remind) {
        clearTimeout(this._reminderSuccessTimer)
        this._reminderSuccessTimer = setTimeout(() => { if (!this._unloaded) this.setData({ reminderSuccess: false }) }, 6600)
      }
    } catch (e) { this.setData({ remind: previous }); view.error(e) }
    finally { this._remindSaving = false }
  },

  async setReminderTime(e) {
    if (this._reminderTimeSaving) return
    const reminderTime = e.currentTarget.dataset.t
    if (!this.data.timeSlots.includes(reminderTime) || reminderTime === this.data.reminderTime) return
    this._reminderTimeSaving = true
    try {
      await api.setProfile({ reminderHm: reminderTime })
      wx.setStorageSync('xingchengq:reminderTime', reminderTime)
      this.setData({ reminderTime, reminderSuccess: true })
      clearTimeout(this._reminderSuccessTimer)
      this._reminderSuccessTimer = setTimeout(() => { if (!this._unloaded) this.setData({ reminderSuccess: false }) }, 6600)
    } catch (e) { view.error(e) }
    finally { this._reminderTimeSaving = false }
  },

  goReport() { wx.navigateTo({ url: '/pages/report/index' }) },
  goSubjects() { wx.navigateTo({ url: '/pages/onboarding/index?step=subjects' }) },
  goPracticeFromWeak() { wx.switchTab({ url: '/pages/practice/index' }) },

  setTabBarHidden(hidden) {
    const tabBar = this.getTabBar && this.getTabBar()
    if (tabBar) tabBar.setData({ hidden })
  },
  async openCorrections() {
    if (this.data.correctionsLoading) return
    this.setData({ showCorrections: true, correctionsOffset: 0, correctionsTracking: false, correctionsList: [], correctionsHasMore: false, correctionsPage: 0 })
    this.setTabBarHidden(true)
    await this.loadCorrections(true)
  },
  async loadCorrections(reset = false) {
    if (this.data.correctionsLoading || (!reset && !this.data.correctionsHasMore)) return
    const page = reset ? 1 : this.data.correctionsPage + 1
    this.setData({ correctionsLoading: true })
    try {
      const result = await api.listCorrections({ page, pageSize: 20 })
      const rows = (result.items || []).map(x => ({ ...x, id: x._id, question: x.questionId, summary: x.text, status: x.status === 'done' ? '已处理' : '校准中', createdAt: new Date(x.createdAt).toLocaleDateString() }))
      const existing = reset ? [] : this.data.correctionsList
      const seen = new Set(existing.map(x => x.id))
      const merged = existing.concat(rows.filter(x => !seen.has(x.id)))
      this.setData({ correctionsList: merged, correctionsPage: page, correctionsHasMore: Boolean(result.hasMore) })
    } catch (e) {
      if (reset) {
        this.setData({ showCorrections: false, correctionsOffset: 0, correctionsTracking: false })
        this.setTabBarHidden(false)
      }
      view.error(e)
    } finally {
      this.setData({ correctionsLoading: false })
    }
  },
  loadMoreCorrections() { return this.loadCorrections(false) },
  closeCorrections() {
    this._correctionsStartY = null
    this._correctionsLastMoveAt = 0
    this.setData({ showCorrections: false, correctionsOffset: 0, correctionsTracking: false })
    this.setTabBarHidden(false)
  },
  onCorrectionsGripStart(e) {
    const touch = e.touches && e.touches[0]
    this._correctionsStartY = touch ? touch.clientY : null
    this.setData({ correctionsTracking: true })
  },
  onCorrectionsGripMove(e) {
    if (this._correctionsStartY == null) return
    const touch = e.touches && e.touches[0]
    if (!touch) return
    const now = Date.now()
    if (this._correctionsLastMoveAt && now - this._correctionsLastMoveAt < 16) return
    this._correctionsLastMoveAt = now
    this.setData({ correctionsOffset: Math.max(0, touch.clientY - this._correctionsStartY) })
  },
  onCorrectionsGripEnd() {
    const dy = this.data.correctionsOffset
    this._correctionsStartY = null
    this._correctionsLastMoveAt = 0
    if (dy > 110) return this.closeCorrections()
    this.setData({ correctionsTracking: false, correctionsOffset: 0 })
  },
  noop() {},

  showPolicy(e) {
    wx.showModal({
      title: e.currentTarget.dataset.title,
      content: '正式上线前接入已审核的全文地址。演示版不会上传你的微信资料。',
      showCancel: false
    })
  },

  deleteAccount() {
    wx.showModal({
      title: '注销星籍？',
      content: '注销后账号将停用，无法继续访问学习服务。确认注销？',
      confirmText: '确认注销',
      confirmColor: '#FF5A64',
      success: async ({ confirm }) => {
        if (!confirm) return
        try { await api.deleteAccount() } catch (e) { view.error(e); return }
        let cleanupFailed = false
        try {
          const removed = correctionDraft.clear() || []
          await Promise.all(removed.filter(item => item.localSaved && item.localPath).map(item => new Promise(resolve => {
            if (!wx.removeSavedFile) { cleanupFailed = true; resolve(); return }
            wx.removeSavedFile({ filePath: item.localPath, success: resolve, fail: () => { cleanupFailed = true; resolve() } })
          })))
        } catch (e) { cleanupFailed = true }
        ;['xingchengq:onboarded', 'xingchengq:dailyCompleted', 'xingchengq:lastAnswers', 'xingchengq:lastPartStates', 'xingchengq:corrections', 'xingchengq:excludedWrongIds', 'xingchengq:removedWrongIds', 'xingchengq:localWrong', 'xingchengq:checkins'].forEach((key) => {
          try { wx.removeStorageSync(key) } catch (e) { cleanupFailed = true }
        })
        require('../../services/practice-draft').bind(null)
        correctionDraft.bind(null)
        if (cleanupFailed) view.error(new Error('账号已停用，部分本地缓存未清理，请清理小程序缓存'))
        wx.reLaunch({ url: '/pages/onboarding/index' })
      }
    })
  }
})
