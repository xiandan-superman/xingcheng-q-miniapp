// Keep every required figure in source order; partial URL resolution is a failure.
async function questionImages(question, platform, resolveImages) {
  const ids = (question && question.imageFileIds) || []
  if (!ids.length) return ((question && (question.imageUrls || question.images)) || []).filter(url => typeof url === 'string' && /^https?:\/\//i.test(url))
  const resolve = resolveImages || (id => require('./student').getQuestionImages(id))
  const response = await resolve(question._id)
  return ids.map(id => {
    const item = (response.images || []).find(row => row.fileID === id)
    if (!item || !item.url) throw new Error('题图加载不完整，请重试')
    return item.url
  })
}
module.exports = { questionImages }
