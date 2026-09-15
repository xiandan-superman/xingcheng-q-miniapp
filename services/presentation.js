const subjects = { mse: '材料科学基础', phychem: '物理化学' }
const types = { truefalse: '判断题', single: '单选题', multi: '多选题', judge: '判断题', fill: '填空题', short: '简答题', composite: '综合题' }
function question(q) {
  if (!q) return null
  const rawParts = q.type === 'composite' ? q.parts || [] : q.type === 'fill' ? q.blanks || [] : [{}]
  return { ...q, id: q._id, kind: q.type === 'truefalse' ? 'judge' : q.type, type: types[q.type] || q.type, subject: subjects[q.subjectId] || q.subjectId,
    summary: q.stemPlain || q.stemMd || '', stem: q.stemMd || q.stemPlain || '',
    parts: rawParts.map((p, i) => ({ ...p, id: p.id || String(i), title: p.title || '作答 ' + (i + 1), prompt: p.prompt || p.promptMd || p.stemMd || '', placeholder: '写下你的答案' })),
    options: (q.type === 'judge' || q.type === 'truefalse'
      ? [{ key: 'true', text: '正确', mark: '正' }, { key: 'false', text: '错误', mark: '误' }]
      : q.options || []
    ).map((o, i) => {
      if (typeof o === 'string') {
        const key = String.fromCharCode(65 + i)
        return { key, text: o, mark: key }
      }
      const key = String(o.key || o.id || String.fromCharCode(65 + i))
      const text = o.text || o.md || o.content || o.label || ''
      // 判断题禁止在方框露 raw true/false
      const mark = o.mark || (/^(true|false)$/i.test(key)
        ? (String(key).toLowerCase() === 'true' ? '正' : '误')
        : key)
      return { key, text, mark }
    }) }
}
function error(err) { wx.showToast({ title: err.message || '连接失败，请重试', icon: 'none' }) }
function dates(count = 7) {
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
  return Array.from({ length: count }, (_, i) => new Date(Date.parse(today + 'T00:00:00Z') - (count - 1 - i) * 86400000).toISOString().slice(0, 10))
}
module.exports = { question, error, dates, subjects }
