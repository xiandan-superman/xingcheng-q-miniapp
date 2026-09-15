const studyOutbox = require('../../services/study-outbox')
const student = require('../../services/student')
const uvToast = require('../../utils/uv-toast')

/** 选科只展示有已发布题的学科；优先用 bootstrap.subjects[].publishedCount */
function filterSubjectsWithPublished(localSubjects, remoteSubjects) {
  const remote = Array.isArray(remoteSubjects) ? remoteSubjects : []
  return (localSubjects || []).filter((item) => {
    const hit = remote.find((r) => r && (r._id === item.id || r.id === item.id))
    if (hit && typeof hit.publishedCount === 'number') return hit.publishedCount > 0
    // 无服务端计数时：体验默认隐藏已知空库（phychem=0）；有计数后走上面分支
    if (item.id === 'phychem') return false
    return true
  })
}

const SUBJECT_CATALOG = [
  { id: 'phychem', name: '物理化学', detail: '热力学 · 化学平衡 · 相平衡基础', short: '物化', theme: 'chemistry', selected: false },
  { id: 'mse', name: '材料科学基础', detail: '相图 · 固态相变 · 组织与性能', short: '材料', theme: 'material', selected: true }
]

Page({
  data: {
    // boot=奶油底校验中（不闪星门）；welcome=已启航欢迎回归；gate=完整星门三步
    phase: 'boot',
    step: 'access',
    topPad: 26,
    reduceMotion: false,
    editMode: false,
    agreed: false,
    selectedCount: 1,
    subjects: SUBJECT_CATALOG.map(item => ({ ...item })),
    loading: true,
    accessLoading: false,
    subjectSaving: false,
    launching: false,
    accessCode: '',
    welcomeStreak: 0,
    qState: 'rest',
    qAccessory: 'none',
    qPlayToken: 0,
    firstLoginMotion: 'still'
  },

  onLoad(options) {
    uvToast.attach(this)
    const g = (getApp() && getApp().globalData) || {}
    try { wx.removeStorageSync('xingchengq:devSkipGate') } catch (e) {}
    this.setData({ topPad: (g.statusBarHeight || 20) + 6, reduceMotion: !!g.reduceMotion })
    if (options.step === 'subjects') {
      this.setData({ phase: 'gate', step: 'subjects', editMode: true, qState: 'rest', qAccessory: 'none' })
      this.loadAccessState({ initial: true })
      return
    }
    // 冷启动：先 cream boot，等云侧 gate，绝不信任本地 onboarded 单独放行
    this.setData({ phase: 'boot', loading: true })
    this.loadAccessState({ initial: true })
  },

  onHide() {
    const entry = this.selectComponent && this.selectComponent('#welcomeEntry')
    if (entry && typeof entry.stop === 'function') entry.stop()
    if (this.data.qAccessory !== 'none') this.setData({ qAccessory: 'none' })
  },

  onUnload() {
    this._unloaded = true
    clearTimeout(this._waveFallback)
    clearTimeout(this._returnTimer)
    this._afterWave = null
  },

  enterToday() {
    if (this._enteringToday) return
    this._enteringToday = true
    const entry = this.selectComponent && this.selectComponent('#welcomeEntry')
    if (entry && typeof entry.stop === 'function') entry.stop()
    wx.switchTab({ url: '/pages/today/index', fail: () => { this._enteringToday = false } })
  },

  async loadAccessState(opts) {
    if (this._accessPending || this._unloaded) return
    this._accessPending = true
    const initial = opts && opts.initial
    if (!initial) this.setData({ accessLoading: true })
    else this.setData({ loading: true })
    try {
      const result = await student.bootstrap()
      if (this._unloaded) return
      const unavailable = result.accountUnavailable || result.gate === 'not_whitelisted'
      const owner = unavailable ? null : result.user && result.user.studyOwner
      require('../../services/account-session').bind(owner)
      studyOutbox.bind(owner)
      require('../../services/practice-draft').bind(owner)
      require('../../services/correction-draft').bind(owner)
      if (result.gate === 'ready') studyOutbox.flush().catch(() => {})
      const selected = (result.user && result.user.selectedSubjectIds) || []
      const catalog = filterSubjectsWithPublished(SUBJECT_CATALOG, result.subjects)
      let subjects = catalog.map((item) => ({ ...item, selected: selected.includes(item.id) }))
      if (!subjects.some((s) => s.selected) && subjects.length) {
        subjects = subjects.map((s, i) => ({ ...s, selected: i === 0 }))
      }
      const selectedCount = subjects.filter((item) => item.selected).length
      const streak = (result.checkin && Number(result.checkin.streak)) || 0

      // 改学科入口：只刷新列表
      if (this.data.editMode && !unavailable) {
        this.setData({
          phase: 'gate',
          step: 'subjects',
          subjects,
          selectedCount,
          accessCode: result.accessCode || '',
          loading: false,
          accessLoading: false
        })
        return
      }

      // 未就绪：清脏本地旗，真正拦住走星门
      if (result.gate !== 'ready') {
        try { wx.removeStorageSync('xingchengq:onboarded') } catch (e) {}
        let step = 'access'
        if (result.gate === 'pick_subject') step = 'subjects'
        else if (result.gate === 'agree') step = 'agreement'
        const patch = {
          phase: 'gate',
          accountUnavailable: !!result.accountUnavailable,
          step,
          subjects,
          selectedCount,
          accessCode: result.accessCode || '',
          loading: false,
          accessLoading: false,
          welcomeStreak: 0
        }
        if (step === 'subjects') {
          patch.qState = 'rest'
          patch.qAccessory = 'none'
          patch.firstLoginMotion = this.data.reduceMotion ? 'still' : 'auto'
        }
        this.setData(patch)
        return
      }

      // 云侧已启航：写本地旗；冷启动出欢迎回归（当次会话一次），禁止闪星门
      wx.setStorageSync('xingchengq:onboarded', true)
      const g = getApp().globalData
      if (g.welcomeShownThisSession) {
        this.setData({ loading: false, accessLoading: false, welcomeStreak: streak })
        wx.switchTab({ url: '/pages/today/index' })
        return
      }
      g.welcomeShownThisSession = true
      this.setData({
        phase: 'welcome',
        loading: false,
        accessLoading: false,
        welcomeStreak: streak,
        qState: 'invite',
        qAccessory: 'none'
      })
    } catch (error) {
      if (this._unloaded) return
      this.setData({ loading: false, accessLoading: false, phase: this.data.phase === 'boot' ? 'gate' : this.data.phase, step: 'access' })
      this.uvToast({ type: 'err', text: error.message || '无法连接星图' })
    } finally {
      this._accessPending = false
    }
  },

  refreshAccess() { this.loadAccessState({ initial: false }) },

  copyAccessCode() {
    if (!this.data.accessCode) return
    wx.setClipboardData({ data: this.data.accessCode, success: () => this.uvToast({ type: 'star', text: '身份码已复制' }) })
  },

  toggleSubject(e) {
    if (this._pendingSubjectSave || this._returnTimer || this.data.loading || this._unloaded) return
    const name = e.currentTarget.dataset.name
    const subjects = this.data.subjects.map((x) => (x.name === name ? { ...x, selected: !x.selected } : x))
    this.setData({ subjects, selectedCount: subjects.filter((x) => x.selected).length })
  },

  async nextFromSubjects() {
    if (!this.data.selectedCount) {
      this.uvToast({ type: 'err', text: '请至少选择一个领域' })
      return
    }
    if (this._pendingSubjectSave || this._returnTimer || this.data.loading || this._unloaded) return
    this._pendingSubjectSave = true
    const selectedIds = this.data.subjects.filter((item) => item.selected).map((item) => item.id)
    this.setData({
      subjectSaving: true,
      qState: 'invite',
      qAccessory: 'wave-invite',
      qPlayToken: Date.now()
    })
    this._afterWave = async () => {
      if (this._unloaded || this._subjectSaveStarted) return
      this._subjectSaveStarted = true
      try {
        await student.setSubjects(selectedIds)
        if (this._unloaded) return
        if (this.data.editMode) {
          this.uvToast({ type: 'star', text: '星图领域已更新' })
          this._returnTimer = setTimeout(() => { if (!this._unloaded) wx.navigateBack() }, 500)
          return
        }
        this.setData({ step: 'agreement', qState: 'rest', qAccessory: 'none' })
      } catch (error) {
        if (this._unloaded) return
        this.setData({ qState: 'invite', qAccessory: 'none' })
        this.uvToast({ type: 'err', text: error.message || '领域更新失败' })
      } finally {
        if (!this._unloaded) this.setData({ subjectSaving: false })
        this._subjectSaveStarted = false
        this._pendingSubjectSave = false
        this._afterWave = null
      }
    }
    clearTimeout(this._waveFallback)
    this._waveFallback = setTimeout(() => {
      if (this._afterWave) this._afterWave()
    }, 1600)
  },

  onQPlayEnd(e) {
    if (this._unloaded) return
    const detail = (e && e.detail) || {}
    if (detail.accessory === 'wave-invite' || this.data.qAccessory === 'wave-invite') {
      clearTimeout(this._waveFallback)
      this.setData({ qAccessory: 'none', qState: 'invite' })
      if (this._afterWave) this._afterWave()
    }
  },

  toggleAgree() { if (this.data.launching) return; this.setData({ agreed: !this.data.agreed }) },

  showPolicy(e) {
    wx.showModal({
      title: e.currentTarget.dataset.title,
      content: '正式上线前接入已审核的全文地址。演示版不会上传你的微信资料。',
      showCancel: false
    })
  },

  async launch() {
    if (this.data.launching || this._unloaded) return
    if (!this.data.agreed) {
      this.uvToast({ type: 'err', text: '请先勾选并同意约定' })
      return
    }
    this.setData({ launching: true })
    try {
      await student.agree()
      if (this._unloaded) return
      wx.setStorageSync('xingchengq:onboarded', true)
      const g = getApp().globalData
      g.welcomeShownThisSession = true
      wx.switchTab({ url: '/pages/today/index' })
    } catch (error) {
      if (this._unloaded) return
      this.uvToast({ type: 'err', text: error.message || '启航失败' })
    } finally {
      if (!this._unloaded) this.setData({ launching: false })
    }
  },

  back() {
    if (this.data.launching) return
    clearTimeout(this._returnTimer)
    this._returnTimer = null
    if (this._pendingSubjectSave) { this.uvToast({ type: 'star', text: '正在保存领域，请稍候' }); return }
    if (this.data.editMode) { wx.navigateBack(); return }
    const { step } = this.data
    if (step === 'agreement') this.setData({ step: 'subjects', qState: 'rest', qAccessory: 'none' })
    else if (step === 'subjects') this.setData({ step: 'access' })
    else wx.navigateBack()
  },

  backWechat() {
    this.uvToast({ type: 'err', text: '请等待邀请信号' })
  }
})
