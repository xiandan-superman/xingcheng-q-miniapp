const api = require('../../services/student')
const view = require('../../services/presentation')

const DIFF_MAP = {
  easy: 'easy', mid: 'mid', hard: 'hard',
  '易': 'easy', '中': 'mid', '难': 'hard',
  '简单': 'easy', '中等': 'mid', '困难': 'hard',
  '基础': 'easy', '进阶': 'mid', '挑战': 'hard'
}
const DIFF_LABEL = { easy: '易', mid: '中', hard: '难' }

function normDiff(v) {
  if (!v) return ''
  const key = DIFF_MAP[v] || DIFF_MAP[String(v).toLowerCase()] || ''
  return key
}

Page({
  data: {
    topPad: 80,
    reduceMotion: false,
    kpAll: true,
    kpSelected: [],
    kpOptions: [],
    diffFilter: 'all',
    diffOptions: [
      { key: 'all', label: '全部' },
      { key: 'easy', label: '易' },
      { key: 'mid', label: '中' },
      { key: 'hard', label: '难' }
    ],
    timeFilter: 'all',
    timeOptions: [
      { key: 'all', label: '全部' },
      { key: '7', label: '近7天' },
      { key: '30', label: '近30天' },
      { key: 'older', label: '更早' }
    ],
    masteryFilter: 'unmastered',
    masteryOptions: [
      { key: 'all', label: '全部' },
      { key: 'unmastered', label: '未掌握', dot: 'var(--red)' },
      { key: 'mastered', label: '已校准', dot: 'var(--green)' }
    ],
    totalCount: 0, hasMore: false,
    items: [],
    loading: true,
    message: '',
    wrongQPlayToken: 0
  },

  async onShow() {
    if (this._unloaded) return
    this._hidden = false
    this._opening = false
    const request = this._request = (this._request || 0) + 1
    const g = getApp().globalData
    this.setData({ topPad: (g.statusBarHeight || 20) + Math.max(8, Math.round(((g.navBarHeight || 44) - 16) / 2)), reduceMotion: !!g.reduceMotion, loading: true, message: '', wrongQPlayToken: Date.now() })
    const tab = this.getTabBar && this.getTabBar()
    if (tab) {
      tab.setData({ hidden: false })
      if (typeof tab.syncCurrentPage === 'function') tab.syncCurrentPage()
    }
    try {
      const data = await api.listWrong({})
      if (request !== this._request) return
      const allItems = (data.items || []).map((x) => {
        const qv = view.question(x.question)
        const diffRaw = x.difficulty || (x.question && x.question.difficulty) || ''
        const diffKey = normDiff(diffRaw)
        const kpIds = x.knowledgePointIds || []
        const kpNames = x.knowledgePointNames || []
        return {
          ...x,
          id: x.questionId,
          ...qv,
          title: (x.question && x.question.stemPlain) || (qv && qv.summary) || '',
          state: x.mastery,
          point: kpNames.join(' · ') || '未标注知识点',
          kpIds,
          diffKey,
          diffLabel: DIFF_LABEL[diffKey] || diffRaw || '—',
          addedDays: Math.floor((Date.now() - new Date(x.addedAt).getTime()) / 86400000)
        }
      })
      // 知识点选项：从当前列表汇总
      const kpMap = {}
      allItems.forEach((it) => {
        (it.kpIds || []).forEach((id, i) => {
          if (!kpMap[id]) kpMap[id] = (it.knowledgePointNames && it.knowledgePointNames[i]) || id
        })
      })
      const selected = (this.data.kpSelected || []).filter(id => Object.prototype.hasOwnProperty.call(kpMap, id))
      const kpOptions = Object.keys(kpMap).map((id) => ({ id, name: kpMap[id], on: selected.indexOf(id) >= 0 }))
      if (tab && typeof tab.setWrongDot === 'function') tab.setWrongDot(allItems.some(item => item.state === 'unmastered') ? 1 : 0)
      this.allItems = allItems
      this.setData({ kpOptions, kpSelected: selected, kpAll: selected.length === 0 })
      this.applyFilters()
    } catch (e) {
      if (request !== this._request) return
      this.setData({ message: e.message })
      view.error(e)
    } finally {
      if (request === this._request) this.setData({ loading: false })
    }
  },

  toggleKp(e) {
    const kp = e.currentTarget.dataset.kp
    if (kp === 'all') {
      this.setData({ kpAll: true, kpSelected: [], kpOptions: this.data.kpOptions.map((x) => ({ ...x, on: false })) })
      this.applyFilters()
      return
    }
    let selected = (this.data.kpSelected || []).slice()
    const i = selected.indexOf(kp)
    if (i >= 0) selected.splice(i, 1)
    else selected.push(kp)
    const kpAll = selected.length === 0
    this.setData({
      kpAll,
      kpSelected: selected,
      kpOptions: this.data.kpOptions.map((x) => ({ ...x, on: selected.indexOf(x.id) >= 0 }))
    })
    this.applyFilters()
  },
  setDiff(e) { this.setData({ diffFilter: e.currentTarget.dataset.diff }); this.applyFilters() },
  setTime(e) { this.setData({ timeFilter: e.currentTarget.dataset.time }); this.applyFilters() },
  setMastery(e) { this.setData({ masteryFilter: e.currentTarget.dataset.mastery }); this.applyFilters() },

  applyFilters() {
    const { kpAll, kpSelected, diffFilter, timeFilter, masteryFilter } = this.data
    const allItems = this.allItems || []
    const items = allItems.filter((x) => {
      if (masteryFilter !== 'all' && x.state !== masteryFilter) return false
      if (diffFilter !== 'all' && x.diffKey !== diffFilter) return false
      if (!kpAll && kpSelected.length) {
        const hit = (x.kpIds || []).some((id) => kpSelected.indexOf(id) >= 0)
        if (!hit) return false
      }
      const d = x.addedDays
      if (timeFilter === '7' && !(d < 7)) return false
      if (timeFilter === '30' && !(d < 30)) return false
      if (timeFilter === 'older' && !(d >= 30)) return false
      return true
    })
    this.filteredItems = items
    this.visibleCount = 20
    this.renderItems()
  },

  renderItems() {
    const rows = this.filteredItems || []
    this.setData({ items: rows.slice(0, this.visibleCount), totalCount: rows.length, hasMore: this.visibleCount < rows.length })
  },
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this.visibleCount += 20
    this.renderItems()
  },
  onHide() { this._hidden = true; this._request = (this._request || 0) + 1 },
  onUnload() { this.onHide(); this._unloaded = true },

  redo(e) {
    if (this.data.loading || this._opening || this._hidden || this._unloaded) return
    this._opening = true
    const { id, title } = e.currentTarget.dataset
    const t = encodeURIComponent(title || '待校准星轨')
    wx.navigateTo({ url: `/pages/quiz/index?scene=wrong&id=${encodeURIComponent(id)}&title=${t}`, fail: () => { this._opening = false; if (!this._hidden && !this._unloaded) view.error(new Error('页面打开失败，请重试')) } })
  },
  async onPullDownRefresh() {
    await this.onShow()
    wx.stopPullDownRefresh()
  },

  async remove(e) {
    if (this._removing || this._hidden || this._unloaded) return
    this._removing = true
    try { await api.removeWrong(e.currentTarget.dataset.id); if (!this._hidden && !this._unloaded) await this.onShow() } catch (err) { if (!this._hidden && !this._unloaded) view.error(err) } finally { this._removing = false }
  },
  goPractice() { wx.switchTab({ url: '/pages/practice/index' }) }
})
