Page({
  onLoad() {
    try {
      const onboarded = wx.getStorageSync('xingchengq:onboarded')
      if (onboarded) {
        wx.switchTab({ url: '/pages/today/index' })
        return
      }
    } catch (e) {}
    wx.reLaunch({ url: '/pages/onboarding/index' })
  }
})
