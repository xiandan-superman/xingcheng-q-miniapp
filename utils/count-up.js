/**
 * 数字滚动工具
 * ------------------------------------------------------------
 * 用于星能天数、学习星图指标、报告稳定度等"数字直出"的位置。
 * 尊重全局 reduceMotion：开关打开时直接落终值，不做逐帧 setData，
 * 避免低端机在滚动计数时掉帧。
 *
 * 用法：
 *   const { countUp } = require('../../utils/count-up')
 *   countUp(this, 'streak', 12, { duration: 620 })
 *   countUp(this, 'accuracy', 86.5, { decimals: 1 })
 *
 * 注意：同一字段重复调用会先清掉上一次的计时器。
 */

/** 三次缓出，前快后慢，落点更稳 */
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3)
}

function format(value, decimals) {
  return decimals > 0 ? Number(value).toFixed(decimals) : Math.round(value)
}

/**
 * @param {object}  ctx              页面 / 组件实例（this）
 * @param {string}  key              setData 字段名，值应为数字
 * @param {number}  to               目标值
 * @param {object}  [opts]
 * @param {number}  [opts.duration]  时长，默认 620ms
 * @param {number}  [opts.decimals]  小数位，默认 0
 * @param {Function}[opts.onDone]    结束回调
 */
function countUp(ctx, key, to, opts) {
  if (!ctx || !key) return
  const o = opts || {}
  const duration = o.duration == null ? 620 : Number(o.duration)
  const decimals = Number(o.decimals) || 0
  const from = Number(ctx.data[key]) || 0
  const target = Number(to) || 0

  const app = typeof getApp === 'function' ? getApp() : null
  const reduce = !!(app && app.globalData && app.globalData.reduceMotion)

  const timers = ctx.__uvCount || (ctx.__uvCount = {})
  if (timers[key]) {
    clearInterval(timers[key])
    timers[key] = null
  }

  if (reduce || duration <= 0 || from === target) {
    ctx.setData({ [key]: format(target, decimals) })
    if (typeof o.onDone === 'function') o.onDone.call(ctx)
    return
  }

  const t0 = Date.now()
  const step = () => {
    const p = Math.min(1, (Date.now() - t0) / duration)
    const value = from + (target - from) * easeOut(p)
    if (p >= 1) {
      clearInterval(timers[key])
      timers[key] = null
      ctx.setData({ [key]: format(target, decimals) })
      if (typeof o.onDone === 'function') o.onDone.call(ctx)
      return
    }
    ctx.setData({ [key]: format(value, decimals) })
  }

  // 32ms ≈ 30fps，足够顺滑且 setData 压力可控
  timers[key] = setInterval(step, 32)
  step()
}

/** 页面卸载前调用，清理所有计时器 */
function clearCountUp(ctx) {
  if (!ctx || !ctx.__uvCount) return
  const timers = ctx.__uvCount
  Object.keys(timers).forEach((k) => {
    if (timers[k]) clearInterval(timers[k])
    timers[k] = null
  })
}

module.exports = { countUp, clearCountUp }
