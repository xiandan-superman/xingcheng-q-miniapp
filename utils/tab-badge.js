const api = require('../services/student')

let pending

/** 仅查询是否存在可打开的未掌握错题；同时切页共用正在进行的请求。 */
async function syncWrongDot(page) {
  const tab = page && page.getTabBar && page.getTabBar()
  if (!tab || typeof tab.setWrongDot !== 'function') return
  try {
    if (!pending) pending = api.getWrongBadge().finally(() => { pending = null })
    const data = await pending
    tab.setWrongDot(data && data.hasWrong ? 1 : 0)
  } catch (e) {
    // 保持现状
  }
}

module.exports = { syncWrongDot }
