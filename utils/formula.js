// 公式/材料符号排版：把普通文本转成 rich-text nodes
// 规则：
//   - 数字跟在字母后作为下标：Fe3C -> Fe<sub>3</sub>C、0.45%C 不处理（数字在最前）
//   - 常见希腊字母/箭头统一：γ α δ 保持，-> 转 →，L+δ 等保持
//   - 温度 ℃、百分号保持
function renderFormula(text) {
  if (!text) return []
  const nodes = []
  // 先按箭头分段，让 → 单独高亮
  const segs = String(text).split(/(→|<-|->)/)
  segs.forEach((seg) => {
    if (seg === '→' || seg === '->' || seg === '<-') {
      nodes.push({ name: 'span', attrs: { style: 'color:#FF8A2A;font-weight:800;padding:0 4rpx;' }, children: [{ type: 'text', text: seg === '<-' ? '←' : '→' }] })
      return
    }
    // 处理下标：字母后紧跟的数字（含小数里的下标场景，如 Fe3C）
    // 匹配：[字母/)] 后接数字（数字不在小数点后）
    const parts = seg.split(/([A-Za-zαγδ\)]\d+)/g)
    parts.forEach((part) => {
      if (!part) return
      const m = part.match(/^([A-Za-zαγδ\)])(\d+)$/)
      if (m) {
        nodes.push({ type: 'text', text: m[1] })
        nodes.push({ name: 'sub', attrs: { style: 'font-size:0.72em' }, children: [{ type: 'text', text: m[2] }] })
      } else {
        nodes.push({ type: 'text', text: part })
      }
    })
  })
  return nodes
}

module.exports = { renderFormula }
