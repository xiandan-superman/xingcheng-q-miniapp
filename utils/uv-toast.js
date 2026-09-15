// 自绘通知：替代 wx.showToast 的系统灰底样式，与贴纸视觉同源。
// 页面接入（三步）：
//   1) const uvToast = require('../../utils/uv-toast')
//   2) onLoad 里调用 uvToast.attach(this)
//   3) WXML 根节点下放通知节点（见 styles/uv-kit.wxss 第 17 节用法）
// 调用：this.uvToast({ type: 'star' | 'info' | 'err', text: '星能 +10', dur: 1900 })

const DEFAULTS = { type: 'info', text: '', dur: 1900 }

function attach(page) {
  if (page.uvToast) return // 幂等
  page.setData({ uvToast: { show: false, type: 'info', text: '' } })
  page.uvToast = function (opts) {
    const o = Object.assign({}, DEFAULTS, opts || {})
    clearTimeout(this._uvToastTimer)
    this.setData({ uvToast: { show: true, type: o.type, text: o.text } })
    this._uvToastTimer = setTimeout(() => {
      try { this.setData({ 'uvToast.show': false }) } catch (e) { /* 页面已销毁 */ }
    }, o.dur)
  }
  // 页面卸载时清计时器，避免对已卸载页面 setData
  const origUnload = page.onUnload
  page.onUnload = function () {
    clearTimeout(this._uvToastTimer)
    if (origUnload) origUnload.call(this)
  }
}

module.exports = { attach }
