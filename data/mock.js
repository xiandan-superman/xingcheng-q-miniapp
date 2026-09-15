// 每日综合题（文字作答）
const question = {
  id: 'mat-fe-c-009',
  subject: '材料科学基础',
  type: '综合题',
  hasImage: true,
  estimate: '约 8–12 分钟',
  summary: '题九 图为 Fe-Fe3C 合金相图，写出三个恒温转变并分析 0.45%C 钢的冷却组织。',
  stem: '题九　图为 Fe-Fe3C 合金相图。',
  parts: [
    { id: 'p1', title: '小问 1 · 恒温转变', prompt: '写出三个恒温转变的反应式、温度及所在成分范围。', placeholder: '写下反应式、温度和成分范围' },
    { id: 'p2', title: '小问 2 · 冷却组织', prompt: '分析含碳量为 0.45% 的铁碳合金从液态缓慢冷却至室温的组织转变过程。', placeholder: '按冷却顺序描述组织变化' },
    { id: 'p3', title: '小问 3 · 绘图说明', prompt: '请绘制室温组织示意图；当前版本请先用文字描述绘图内容。', placeholder: '描述组织组成、形态与相对位置' }
  ]
}

// 选择题（A/B/C/D）
const choiceQuestions = [
  {
    id: 'mat-choice-01',
    subject: '材料科学基础',
    type: '选择题',
    hasImage: false,
    point: 'Fe-Fe3C 相图',
    stem: '在 Fe-Fe3C 相图中，共析转变 γ → α + Fe3C 发生的温度是：',
    options: [
      { key: 'A', text: '1495 ℃（包晶反应温度）' },
      { key: 'B', text: '1148 ℃（共晶反应温度）' },
      { key: 'C', text: '727 ℃（共析反应温度）' },
      { key: 'D', text: '912 ℃（同素异构转变温度）' }
    ],
    answer: 'C',
    analysis: '共析转变发生在 727 ℃、含碳 0.77% 处，奥氏体 γ 同时析出铁素体 α 与渗碳体 Fe3C，形成珠光体 P。'
  },
  {
    id: 'mat-choice-02',
    subject: '材料科学基础',
    type: '选择题',
    hasImage: false,
    point: '二元合金相图',
    stem: '二元匀晶相图中，应用杠杆法则可以计算的是：',
    options: [
      { key: 'A', text: '相的转变温度' },
      { key: 'B', text: '某温度下两相的相对含量' },
      { key: 'C', text: '合金的熔点' },
      { key: 'D', text: '扩散激活能' }
    ],
    answer: 'B',
    analysis: '杠杆法则用于在两相区计算某一温度下平衡两相的相对含量（质量分数），不能求温度、熔点或扩散参数。'
  },
  {
    id: 'mat-choice-03',
    subject: '材料科学基础',
    type: '选择题',
    hasImage: false,
    point: '冷却组织分析',
    stem: '含碳 0.45% 的亚共析钢室温平衡组织是：',
    options: [
      { key: 'A', text: '珠光体 + 二次渗碳体' },
      { key: 'B', text: '铁素体 + 珠光体' },
      { key: 'C', text: '珠光体 + 莱氏体' },
      { key: 'D', text: '全部为铁素体' }
    ],
    answer: 'B',
    analysis: '0.45%C 属亚共析钢，冷到 GS 线以下先析出先共析铁素体，剩余奥氏体在 727 ℃ 共析转变为珠光体，室温组织为 F + P。'
  }
]

const weakPoints = [
  { id: 'kp1', name: 'Fe-Fe₃C 相图', score: 68 },
  { id: 'kp2', name: '恒温转变', score: 65 },
  { id: 'kp3', name: '冷却组织分析', score: 70 },
  { id: 'kp4', name: '二元合金相图', score: 74 },
  { id: 'kp5', name: '扩散与固态相变', score: 78 }
]

const wrongItems = [
  { id: 'w1', type: '综合题', subject: '材料科学基础', title: 'Fe-Fe₃C 合金相图：三个恒温转变与冷却组织', state: 'unmastered', point: '恒温转变', difficulty: '困难', addedDays: 1, questionId: 'mat-fe-c-009' },
  { id: 'w2', type: '选择题', subject: '材料科学基础', title: '二元合金相图：杠杆法则计算平衡相含量', state: 'unmastered', point: '二元合金相图', difficulty: '中等', addedDays: 5, questionId: 'mat-choice-02' },
  { id: 'w3', type: '综合题', subject: '材料科学基础', title: '扩散与固态相变：菲克定律应用', state: 'mastered', point: '扩散与固态相变', difficulty: '中等', addedDays: 18, questionId: '' }
]

module.exports = { question, choiceQuestions, weakPoints, wrongItems }
