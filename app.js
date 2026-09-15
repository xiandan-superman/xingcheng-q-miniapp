const localDisplayFont = require('./assets/fonts/local-font')

App({
  globalData: {
    cloudEnv: 'cloud1-d4g88bka6d0c9b288',
    enableCloud: true,
    reduceMotion: false,
    user: { nickname: '星橙学生', subjects: ['材料科学基础'] },
    // 导航安全区（px，页面用 rpx 时由页面自行换算；这里直接给 px 数值）
    statusBarHeight: 20,   // 状态栏高度
    navBarHeight: 44,      // 胶囊按钮所在导航栏高度
    navTotalHeight: 64     // 状态栏 + 导航栏，页面内容从这里开始
  },

  onLaunch() {
    this.computeNavMetrics()

    wx.loadFontFace({
      family: 'ZCOOL KuaiLe Local',
      source: 'url("' + localDisplayFont + '")',
      global: true,
      scopes: ['webview', 'native'],
      fail: (error) => console.warn('Display font could not be loaded', error)
    })
    if (this.globalData.enableCloud && wx.cloud) {
      wx.cloud.init({ env: this.globalData.cloudEnv, traceUser: true })
    }
    this.globalData.reduceMotion = Boolean(wx.getStorageSync('xingchengq:reduceMotion'))

    // onboarding 为 pages[0]：冷启动一律先落星门页，由该页 bootstrap 判定。
    // 禁止在此按本地 onboarded 抢切今日（会「星门一闪→首页」且脏 storage 会误放行）。
    // 已启航 → 欢迎回归半屏；未启航 → 完整三步。会话内欢迎只出一次见 globalData.welcomeShownThisSession。
    this.globalData.welcomeShownThisSession = false
  },

  computeNavMetrics() {
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const statusBarHeight = Number.isFinite(win.statusBarHeight) && win.statusBarHeight >= 0 ? win.statusBarHeight : 20
      let navBarHeight = 44
      if (wx.getMenuButtonBoundingClientRect) {
        try {
          const menu = wx.getMenuButtonBoundingClientRect()
          // 部分设备启动时返回空尺寸；保留导航栏兜底，避免内容压到状态栏。
          const gap = menu && menu.top - statusBarHeight
          const height = menu && gap * 2 + menu.height
          if (menu && Number.isFinite(menu.top) && Number.isFinite(menu.height) && menu.height > 0 && gap >= 0 && Number.isFinite(height) && height > 0) navBarHeight = height
        } catch (error) {
          // 胶囊接口失败仍保留已获取的真实状态栏高度。
        }
      }
      this.globalData.statusBarHeight = statusBarHeight
      this.globalData.navBarHeight = navBarHeight
      this.globalData.navTotalHeight = statusBarHeight + navBarHeight
    } catch (e) {
      // 兜底使用默认值
    }
  }
})
