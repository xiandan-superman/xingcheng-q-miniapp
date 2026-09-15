function createOutbox(storage, send, id = () => Date.now().toString(36) + '_' + Math.random().toString(36).slice(2)) {
  let owner = '', active = null
  const key = value => 'xingchengq:studyOutbox:' + value
  const read = value => { const rows = storage.getStorageSync(key(value)); return Array.isArray(rows) ? rows : [] }
  const write = (value, rows) => storage.setStorageSync(key(value), rows)
  return {
    bind(value) { owner = value || '' },
    enqueue(startedAt, endedAt) {
      if (!owner) throw new Error('学习账号尚未就绪')
      if (!Number.isSafeInteger(startedAt) || !Number.isSafeInteger(endedAt) || startedAt < 0 || endedAt < startedAt) throw new Error('学习计时异常，请重新进入答题页')
      if (endedAt === startedAt) return
      const rows = read(owner)
      for (let start = startedAt; start < endedAt;) {
        const end = Math.min(endedAt, start + 86400000)
        rows.push({ reportId: id(), startedAt: start, endedAt: end })
        start = end
      }
      write(owner, rows)
    },
    flush() {
      if (active) return active
      const target = owner
      if (!target) return Promise.resolve()
      active = (async () => {
        const deferred = new Set()
        while (owner === target) {
          const row = read(target).find(item => !deferred.has(item.reportId))
          if (!row) break
          try { await send(row) }
          catch (error) {
            if (!['INVALID_HEARTBEAT', 'HEARTBEAT_CONFLICT'].includes(error.code)) throw error
            // Keep the original record for diagnosis/retry without blocking later valid reports.
            deferred.add(row.reportId)
            continue
          }
          // Read again: more intervals may have been appended while awaiting the server.
          write(target, read(target).filter(item => item.reportId !== row.reportId))
        }
        return { deferred: deferred.size }
      })().finally(() => { active = null })
      return active
    }
  }
}
let singleton
function current() {
  if (!singleton) singleton = createOutbox(wx, data => require('./student').heartbeat(data))
  return singleton
}
module.exports = { createOutbox, bind: owner => current().bind(owner), enqueue: (start,end) => current().enqueue(start,end), flush: () => current().flush() }
