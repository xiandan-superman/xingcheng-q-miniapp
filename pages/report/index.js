const api = require('../../services/student')
const uvToast = require('../../utils/uv-toast')
const view = require('../../services/presentation')
Page({
  data: { saving: false, topPad: 26, reduceMotion: false, reportMotion: 'still', loading: true, accuracy: 0, total: 0, streak: 0, hours: '0.0h', period: '', focus: '暂无错题关联', message: '' },

  async onLoad() {
    uvToast.attach(this)
    const g = (getApp() && getApp().globalData) || {}
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const week = `${now.getFullYear()}-${Math.floor((now - start) / 604800000)}`
    const key = 'xingchengq:reportSceneWeek'
    this._reportWeek = week
    this._reportKey = key
    this._reportShouldPlay = !g.reduceMotion && wx.getStorageSync(key) !== week
    this.setData({ topPad: (g.statusBarHeight || 20) + 6, reduceMotion: !!g.reduceMotion, reportMotion: 'still' })
    await this.loadReport()
  },

  async loadReport() {
    if (this._reportLoading) return
    this._reportLoading = true
    this.setData({ loading: true, message: '' })
    try {
      const [report, calendar] = await Promise.all([api.getReport('7'), api.getCheckins()])
      const days = view.dates()
      const reportReady = Number(report.total) > 0
      const playReport = reportReady && this._reportShouldPlay
      if (playReport) {
        wx.setStorageSync(this._reportKey, this._reportWeek)
        this._reportShouldPlay = false
      }
      this.setData({ accuracy: report.accuracy, total: report.total, streak: calendar.streak, hours: (report.durationMs / 3600000).toFixed(1) + 'h', period: days[0] + ' — ' + days[6], focus: report.weakPoints.map(x => x.name).slice(0, 2).join(' · ') || '暂无错题关联', reportMotion: playReport ? 'auto' : 'still' })
    } catch (e) { this.setData({ message: e.message || '报告读取失败，请重试' }); view.error(e) } finally { this._reportLoading = false; this.setData({ loading: false }) }
  },

  back() { wx.navigateBack() },

  saveCard() {
    if (this.data.saving || this.data.loading || this.data.message) return
    this.setData({ saving: true })
    this.createSelectorQuery().select('#shareCanvas').fields({ node: true }).exec((res) => {
      const item = res && res[0]
      if (!item || !item.node) { this.setData({ saving: false }); view.error(new Error('分享卡暂时无法生成，请重试')); return }
      try { this.paintShare(item.node, () => this.setData({ saving: false })) }
      catch (e) { this.setData({ saving: false }); view.error(new Error('分享卡生成失败，请重试')) }
    })
  },

  paintShare(canvas, done) {
    const ctx = canvas.getContext('2d')
    const w = 600, h = 900
    canvas.width = w
    canvas.height = h

    // 背景
    ctx.fillStyle = '#FFFDF4'
    ctx.fillRect(0, 0, w, h)
    const bg = ctx.createLinearGradient(0, 0, w, h)
    bg.addColorStop(0, '#FFF7D6')
    bg.addColorStop(1, '#EAF9FD')
    ctx.fillStyle = bg
    roundRect(ctx, 28, 28, w - 56, h - 56, 36)
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = '#17191F'
    roundRect(ctx, 28, 28, w - 56, h - 56, 36)
    ctx.stroke()

    // 品牌行
    ctx.fillStyle = '#FF8A2A'
    ctx.font = '700 22px sans-serif'
    ctx.fillText('量子星橙 · WEEKLY ORBIT', 62, 90)

    // 标题
    ctx.fillStyle = '#17191F'
    ctx.font = '900 52px sans-serif'
    ctx.fillText('本周星轨', 62, 162)
    ctx.fillStyle = '#FF8A2A'
    ctx.fillText('学习足迹', 62, 224)
    ctx.fillStyle = '#4B5563'
    ctx.font = '24px sans-serif'
    ctx.fillText(this.data.period, 62, 264)

    // 大数字：按实际宽度紧贴 %，避免固定 x 导致间距炸开
    const acc = String(this.data.accuracy == null ? 0 : this.data.accuracy)
    ctx.fillStyle = '#FF8A2A'
    ctx.font = '900 118px sans-serif'
    const numX = 58
    const numY = 410
    ctx.fillText(acc, numX, numY)
    const numW = (ctx.measureText(acc).width || (acc.length * 70))
    ctx.fillStyle = '#17191F'
    ctx.font = '900 42px sans-serif'
    ctx.fillText('%', numX + numW + 6, 400)
    ctx.fillStyle = '#4B5563'
    ctx.font = '700 26px sans-serif'
    ctx.fillText('星轨稳定度', 64, 452)

    // 透明静帧 PNG（webp 真机/canvas 常失败）
    const img = canvas.createImage()
    img.onload = () => {
      ctx.drawImage(img, 392, 76, 168, 168)
      this.finishCard(canvas, ctx, w, done)
    }
    img.onerror = () => {
      // 再试 invite 静帧；仍失败才画橙点，避免空白大圆冒充角色
      const img2 = canvas.createImage()
      img2.onload = () => {
        ctx.drawImage(img2, 392, 76, 168, 168)
        this.finishCard(canvas, ctx, w, done)
      }
      img2.onerror = () => {
        ctx.fillStyle = '#FF8A2A'
        ctx.beginPath(); ctx.arc(475, 159, 56, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#17191F'
        ctx.font = '700 22px sans-serif'
        ctx.fillText('星橙Q', 445, 166)
        this.finishCard(canvas, ctx, w, done)
      }
      img2.src = '/assets/xingcheng-q/formal/01-星轨报告-分享静态图-V2.png'
    }
    img.src = '/assets/xingcheng-q/formal/01-星轨报告-分享静态图-V2.png'
  },

  finishCard(canvas, ctx, w, done) {
    // 三格统计
    const metrics = [[String(this.data.total), '答题'], [String(this.data.streak), '连续天数'], [this.data.hours, '学习时长']]
    metrics.forEach((m, i) => {
      const x = 62 + i * 166
      ctx.fillStyle = 'rgba(255,255,255,.9)'
      roundRect(ctx, x, 486, 146, 104, 18)
      ctx.fill()
      ctx.lineWidth = 3; ctx.strokeStyle = '#17191F'
      roundRect(ctx, x, 486, 146, 104, 18)
      ctx.stroke()
      ctx.fillStyle = '#FF8A2A'
      ctx.font = '900 34px sans-serif'
      ctx.fillText(m[0], x + 18, 534)
      ctx.fillStyle = '#4B5563'
      ctx.font = '20px sans-serif'
      ctx.fillText(m[1], x + 18, 570)
    })

    // 本周重点
    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, 62, 620, 476, 86, 18)
    ctx.fill()
    ctx.lineWidth = 3; ctx.strokeStyle = '#EBD98A'
    roundRect(ctx, 62, 620, 476, 86, 18)
    ctx.stroke()
    ctx.fillStyle = '#4B5563'; ctx.font = '19px sans-serif'
    ctx.fillText('本周重点校准', 82, 652)
    ctx.fillStyle = '#17191F'; ctx.font = '700 23px sans-serif'
    ctx.fillText(this.data.focus, 82, 686, 436)

    // 页脚文案（防溢出截断）
    ctx.fillStyle = '#17191F'
    ctx.font = '700 20px sans-serif'
    const foot = '每天解一道星题，给量子星橙充一格能 ✦'
    ctx.fillText(foot, 62, 748, 476)

    // 小程序码/识别入口区（无正式码时画可识别占位，避免分享卡缺入口）
    const qx = 430, qy = 770, qs = 96
    ctx.fillStyle = '#FFFFFF'
    roundRect(ctx, qx, qy, qs, qs, 12)
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#17191F'
    roundRect(ctx, qx, qy, qs, qs, 12)
    ctx.stroke()
    // 简易码纹
    ctx.fillStyle = '#17191F'
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if ((r + c) % 2 === 0 || (r === 2 && c === 2)) {
          ctx.fillRect(qx + 14 + c * 14, qy + 14 + r * 14, 10, 10)
        }
      }
    }
    ctx.fillStyle = '#4B5563'
    ctx.font = '700 18px sans-serif'
    ctx.fillText('长按识别小程序', 62, 806)
    ctx.font = '18px sans-serif'
    ctx.fillText('量子星橙 · 每天一道星题', 62, 836)

    wx.canvasToTempFilePath({
      canvas,
      destWidth: 1200,
      destHeight: 1800,
      success: ({ tempFilePath }) => this.handleCard(tempFilePath),
      fail: () => view.error(new Error('分享卡导出失败，请重试')),
      complete: () => done()
    })
  },

  handleCard(tempFilePath) {
    wx.previewImage({ urls: [tempFilePath] })
    wx.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: () => {
        wx.setStorageSync('xingchengq:shareSuccessJump', 1)
        this.uvToast({ type: 'star', text: '已保存到相册' })
      },
      fail: (err) => {
        if (String(err.errMsg || '').indexOf('auth') >= 0) {
          wx.showModal({
            title: '需要相册权限',
            content: '保存星光卡需要授权访问相册，去设置开启？',
            confirmText: '去设置',
            success: (r) => { if (r.confirm) wx.openSetting() }
          })
        }
        else if (String(err.errMsg || '').indexOf('cancel') < 0) {
          view.error(new Error('未能保存到相册，请重试'))
        }
      }
    })
  },

  onShareAppMessage() {
    wx.setStorageSync('xingchengq:shareSuccessJump', 1)
    const ready = !this.data.loading && !this.data.message
    return { title: ready ? '我的近7天星轨稳定度 ' + this.data.accuracy + '%，来量子星橙每天一道题' : '来量子星橙，每天一道星题', path: '/pages/today/index' }
  }
})

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
