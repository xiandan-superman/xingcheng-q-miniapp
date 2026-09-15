/**
 * 动效试验舱
 * ------------------------------------------------------------
 * 用途：把从 Uiverse.io Galaxy 筛出的候选动效做成真机可跑的对照台，
 *       逐项确认视觉效果与流畅度后，再决定落到哪个正式页面。
 * 说明：本页所有动效来自 styles/uv-kit.wxss，不新增任何图片或字体。
 */
const { countUp, clearCountUp } = require('../../utils/count-up')

// 刻度环：20 格绕一圈，每格 18°（= 5%）
const RING_TICKS = [
  0, 18, 36, 54, 72, 90, 108, 126, 144, 162,
  180, 198, 216, 234, 252, 270, 288, 306, 324, 342
]
const RING_TOTAL = RING_TICKS.length

// 分段进度：5 格
const SEG_STEPS = [0, 1, 2, 3, 4]

// practice 页一次最多选 3 条薄弱点
const KP_LIMIT = 3

const STAGGER_LABELS = [
  '材料科学基础 · 晶体结构',
  '材料科学基础 · 二元相图',
  '固体物理 · 能带理论',
  '固体物理 · 声子与热容',
  '量子力学 · 微扰论初步'
]

Page({
  data: {
    topPad: 26,
    reduceMotion: false,

    // 选择控件 —— 四款，各对应一个真实场景
    // A 整卡多选（onboarding 选星图领域）
    subjectPick: [
      { id: 'mse', name: '材料科学基础', detail: '相图 · 固态相变 · 组织与性能', on: true },
      { id: 'phychem', name: '物理化学', detail: '热力学 · 化学平衡 · 相平衡基础', on: false },
      { id: 'solid', name: '固体物理', detail: '能带理论 · 声子与热容', on: false }
    ],
    // B 轻量勾选（onboarding 同意协议）
    agreed: false,
    // C 互斥选项（quiz / result 这题错在哪）
    corrTypes: ['题干有误', '答案有误', '解析不清', '图片看不清', '其他'],
    corrType: '题干有误',
    // D 带配额的标签多选（practice 选 3 条薄弱点）
    kpTags: [
      { id: 'k1', name: '晶体结构', on: true },
      { id: 'k2', name: '二元相图', on: true },
      { id: 'k3', name: '能带理论', on: true },
      { id: 'k4', name: '声子热容', on: false },
      { id: 'k5', name: '微扰论', on: false },
      { id: 'k6', name: '化学平衡', on: false }
    ],
    kpSelected: 3,
    kpFull: true,
    kpShake: false,

    demoOn: true,

    // 结果反馈
    stampOn: false,
    denyOn: false,

    // 按下态手动演示（模拟器若不响应 hover-class，用它验证同一个样式）
    pressDemo: false,
    rippleDemo: false,

    // 星轨单选（quiz 作答选项方向）
    radioOpts: [
      { id: 'a', key: 'A', txt: '玻尔的原子模型', sub: '轨道量子化 · 定态跃迁' },
      { id: 'b', key: 'B', txt: '卢瑟福核式结构', sub: 'α 粒子散射实验' },
      { id: 'c', key: 'C', txt: '汤姆孙枣糕模型', sub: '电子的发现' },
      { id: 'd', key: 'D', txt: '量子力学电子云', sub: '概率波 · 不确定关系' }
    ],
    radioSel: 'b',

    // 星能通知
    toastShow: false,
    toastN: '+10',

    // 星语气泡 / 星轨输入框
    bubbleOpen: false,
    inputFocus: false,
    inputErr: false,
    inputVal: '',

    // 数据
    counter: 0,
    accuracy: 0,

    // 刻度环
    ringTicks: RING_TICKS,
    ringP: 68,
    ringLit: 14,        // 68% → 14 / 20 格
    ringDeg: 245,       // 弧环用：68% × 3.6 = 244.8°，取整

    // 分段进度
    segs: SEG_STEPS,
    segLit: 3,

    // 列表
    staggerList: [],

    // 弹层
    showSheet: false,
    sheetOffset: 0,
    sheetTracking: false
  },

  onLoad() {
    const g = (getApp() && getApp().globalData) || {}
    this.setData({
      topPad: (g.statusBarHeight || 20) + 2,
      reduceMotion: !!g.reduceMotion
    })
    this.buildStagger()
    this.replayFeedback()
    this.runCount()
    this.syncRing(this.data.ringP)
  },

  onUnload() {
    clearCountUp(this)
    this.clearFeedbackTimer()
    Object.keys(this._flashTimers || {}).forEach((k) => clearTimeout(this._flashTimers[k]))
    this._flashTimers = null
    if (this._kpTimer) clearTimeout(this._kpTimer)
    this._kpTimer = null
    if (this._toastTimer) clearTimeout(this._toastTimer)
    this._toastTimer = null
    if (this._inpTimer) clearTimeout(this._inpTimer)
    this._inpTimer = null
  },

  /* ---------- 按下态手动演示 ---------- */
  // 用数据驱动同一个 hover 样式类，绕开模拟器对 hover-class 的可能不响应
  replayPress() { this.flashClass('pressDemo', 420) },
  replayRipple() { this.flashClass('rippleDemo', 560) },

  flashClass(key, ms) {
    this._flashTimers = this._flashTimers || {}
    if (this._flashTimers[key]) clearTimeout(this._flashTimers[key])
    this.setData({ [key]: false })
    this._flashTimers[key] = setTimeout(() => {
      this.setData({ [key]: true })
      this._flashTimers[key] = setTimeout(() => {
        this.setData({ [key]: false })
        this._flashTimers[key] = null
      }, ms)
    }, 40)
  },

  /* ---------- 数字滚动 ---------- */
  runCount() {
    // 先落 0，再滚到终值；reduceMotion 开启时 countUp 会直接落终值
    this.setData({ counter: 0, accuracy: 0 }, () => {
      countUp(this, 'counter', 128, { duration: 900 })
      countUp(this, 'accuracy', 86.4, { duration: 900, decimals: 1 })
    })
  },

  replayCount() {
    this.runCount()
  },

  /* ---------- 结果反馈 ---------- */
  replayFeedback() {
    this.clearFeedbackTimer()
    // 先摘掉 class 再挂上，才能重播 CSS 动画
    this.setData({ stampOn: false, denyOn: false })
    this._fbTimer = setTimeout(() => {
      this._fbTimer = null
      this.setData({ stampOn: true, denyOn: true })
    }, 40)
  },

  // 单独重播盖章 / 抖动（按钮绑的就是这两个）
  replayStamp() { this.flashFeedback('stampOn') },
  replayDeny() { this.flashFeedback('denyOn') },

  flashFeedback(key) {
    this.clearFeedbackTimer()
    this.setData({ [key]: false })
    this._fbTimer = setTimeout(() => {
      this._fbTimer = null
      this.setData({ [key]: true })
    }, 40)
  },

  clearFeedbackTimer() {
    if (this._fbTimer) {
      clearTimeout(this._fbTimer)
      this._fbTimer = null
    }
  },

  /* ---------- 列表错峰 ---------- */
  buildStagger() {
    const stamp = Date.now()
    const list = STAGGER_LABELS.map((text, i) => ({ id: `s${stamp}-${i}`, text }))
    this.setData({ staggerList: list })
  },

  replayStagger() {
    this.buildStagger()
  },

  /* ---------- 动效闸门 ---------- */
  toggleMotion() {
    const reduceMotion = !this.data.reduceMotion
    wx.setStorageSync('xingchengq:reduceMotion', reduceMotion)
    const app = getApp()
    if (app && app.globalData) app.globalData.reduceMotion = reduceMotion
    this.setData({ reduceMotion })
    if (!reduceMotion) this.replayFeedback()
  },

  /* ---------- 选择控件 ---------- */

  // A 整卡多选：点卡的任何位置都切换
  toggleSubject(e) {
    const id = e.currentTarget.dataset.id
    this.setData({
      subjectPick: this.data.subjectPick.map((x) => (x.id === id ? { ...x, on: !x.on } : x))
    })
  },

  // B 轻量勾选
  toggleConsent() {
    this.setData({ agreed: !this.data.agreed })
  },

  // C 互斥选项：直接换成新值，不需要先取消
  pickCorr(e) {
    this.setData({ corrType: e.currentTarget.dataset.t })
  },

  // D 带配额的标签多选：到顶后先拦下来，再抖一下告诉人"不是没点上"
  toggleKp(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.kpTags
    const target = list.find((x) => x.id === id)
    const picked = list.filter((x) => x.on).length

    if (target && !target.on && picked >= KP_LIMIT) {
      if (this._kpTimer) clearTimeout(this._kpTimer)
      this.setData({ kpShake: false })
      setTimeout(() => this.setData({ kpShake: true }), 30)
      this._kpTimer = setTimeout(() => { this.setData({ kpShake: false }); this._kpTimer = null }, 480)
      return
    }

    const next = list.map((x) => (x.id === id ? { ...x, on: !x.on } : x))
    const selected = next.filter((x) => x.on).length
    this.setData({ kpTags: next, kpSelected: selected, kpFull: selected >= KP_LIMIT })
  },

  toggleDemoOn() { this.setData({ demoOn: !this.data.demoOn }) },

  /* ---------- 星轨单选 ---------- */
  pickRadio(e) {
    this.setData({ radioSel: e.currentTarget.dataset.id })
  },

  /* ---------- 星能通知 ---------- */
  // 先摘再挂，保证连续点按也能重播落下动画；倒计时条走完由 JS 收走
  demoToast(e) {
    const n = (e && e.currentTarget && e.currentTarget.dataset.n) || '+10'
    if (this._toastTimer) clearTimeout(this._toastTimer)
    this.setData({ toastShow: false })
    this._toastTimer = setTimeout(() => {
      this.setData({ toastShow: true, toastN: n })
      this._toastTimer = setTimeout(() => {
        this.setData({ toastShow: false })
        this._toastTimer = null
      }, 2000)
    }, 60)
  },

  /* ---------- 星语气泡 ---------- */
  toggleBubble() {
    this.setData({ bubbleOpen: !this.data.bubbleOpen })
  },

  /* ---------- 星轨输入框 ---------- */
  onInputFocus() { this.setData({ inputFocus: true }) },
  onInputBlur() { this.setData({ inputFocus: false }) },
  onInput(e) { this.setData({ inputVal: e.detail.value }) },

  // 校验失败：红描边 + 复用 uv-deny 抖一下
  shakeInput() {
    if (this._inpTimer) clearTimeout(this._inpTimer)
    this.setData({ inputErr: false })
    this._inpTimer = setTimeout(() => {
      this.setData({ inputErr: true })
      this._inpTimer = setTimeout(() => {
        this.setData({ inputErr: false })
        this._inpTimer = null
      }, 520)
    }, 50)
  },

  /* ---------- 刻度环 ---------- */
  syncRing(p) {
    const pct = Math.max(0, Math.min(100, Number(p) || 0))
    // 四舍五入到最近一格；百分比仍按原值显示，格数只是视觉近似
    const lit = Math.round((pct / 100) * RING_TOTAL)
    // 弧环的角度也在这里算好，避免 WXML 里做乘法
    this.setData({ ringP: pct, ringLit: lit, ringDeg: Math.round(pct * 3.6 * 10) / 10 })
  },

  setRing(e) {
    this.syncRing(e.currentTarget.dataset.p)
  },

  /* ---------- 分段进度 ---------- */
  setSegs(e) {
    this.setData({ segLit: Number(e.currentTarget.dataset.v) || 0 })
  },

  /* ---------- 底部弹层拖拽 ---------- */
  openSheet() {
    this.setData({ showSheet: true, sheetOffset: 0, sheetTracking: false })
  },

  closeSheet() {
    this._sheetStartY = null
    this._lastMoveAt = 0
    this.setData({ showSheet: false, sheetOffset: 0, sheetTracking: false })
  },

  noop() {},

  onGripStart(e) {
    const touch = e.touches && e.touches[0]
    this._sheetStartY = touch ? touch.clientY : null
    this.setData({ sheetTracking: true })
  },

  onGripMove(e) {
    if (this._sheetStartY == null) return
    const touch = e.touches && e.touches[0]
    if (!touch) return
    // 节流到 ~60fps，避免高频 setData 拖垮逻辑层
    const now = Date.now()
    if (this._lastMoveAt && now - this._lastMoveAt < 16) return
    this._lastMoveAt = now
    this.setData({ sheetOffset: Math.max(0, touch.clientY - this._sheetStartY) })
  },

  onGripEnd() {
    const dy = this.data.sheetOffset
    this._sheetStartY = null
    this._lastMoveAt = 0
    if (dy > 110) {
      this.closeSheet()
      return
    }
    this.setData({ sheetTracking: false, sheetOffset: 0 })
  },

  /* ---------- 导航 ---------- */
  back() {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: '/pages/today/index' })
  }
})
