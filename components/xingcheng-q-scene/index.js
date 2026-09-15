const BUILDERS={loading:require('./scenes/loading'),empty:require('./scenes/empty'),offline:require('./scenes/offline'),failure:require('./scenes/failure'),recovered:require('./scenes/recovered'),resume:require('./scenes/resume'),reminder:require('./scenes/reminder'),report:require('./scenes/report'),makeup:require('./scenes/makeup'),signal:require('./scenes/signal'),waiting:require('./scenes/waiting')}
const META={
  loading:['01-加载-量子点扫描-V1-结束静态图.png','星橙Q正在扫描星题',6.4],empty:['02-空数据-Q寻找后摊手-V1-结束静态图.png','星橙Q没有找到内容',8.4],offline:['03-断网-天线打结-V1-结束静态图.png','星橙Q正在检查网络',8.8],failure:['04-提交失败-信号舱熄火-V2-结束静态图.png','星橙Q提交失败',7.8],recovered:['05-网络恢复-青色信号接入-V1-结束静态图.png','星橙Q已重新连接网络',6.6],resume:['06-继续练习-进度接续-V2-结束静态图.png','星橙Q接续未完成练习',6.4],reminder:['07-提醒成功-提醒确认-V2-结束静态图.png','星橙Q已设置提醒',6.4],report:['01-星轨报告-分享静态图-V2.png','星橙Q展开星轨报告',11.8],makeup:['02-回溯补能-倒转打捞-V1-静态终帧.png','星橙Q完成回溯补能',11.4],signal:['03-校准反馈-靶心确认-V2-静态终帧.png','星橙Q完成校准反馈',6.2],waiting:['04-等待邀请-邀请卡等待-V2-静态终帧.png','星橙Q等待邀请',6.5]
}
const FRAME_MS=32
Component({
  properties:{scene:{type:String,value:'loading',observer(){this.restart()}},size:{type:Number,value:160},motion:{type:String,value:'auto',observer(){this.restart()}},playToken:{type:null,value:0,observer(){this.restart()}},once:{type:Boolean,value:true}},
  data:{fallbackSrc:'/assets/xingcheng-q/formal/01-加载-量子点扫描-V1-结束静态图.png',label:'',canvasReady:true,settled:false,canvasShown:false,settling:false},
  lifetimes:{attached(){this._attached=true;this._visible=true;this._runId=0;this.restart()},detached(){this._attached=false;this._runId=(this._runId||0)+1;this.stop();this.release()}},
  pageLifetimes:{show(){this._visible=true;if(this._attached)this.restart()},hide(){this._visible=false;this._runId=(this._runId||0)+1;this.stop();this.release();this.setData({settled:true,canvasShown:false,settling:false})}},
  methods:{
    sceneName(){return BUILDERS[this.properties.scene]?this.properties.scene:'loading'},
    fail(name,run){if(run!==undefined&&run!==this._runId)return;const key=BUILDERS[name]?name:'loading',meta=META[key];this.stop();this.release();this.setData({canvasReady:false,settled:true,canvasShown:false,settling:false,fallbackSrc:'/assets/xingcheng-q/formal/'+meta[0],label:meta[1]})},
    release(){this._ready=false;this._canvas=null;this._ctx=null;this._scene=null},
    stop(){if(this._canvas&&this._raf)this._canvas.cancelAnimationFrame(this._raf);this._raf=null;if(this._delay)clearTimeout(this._delay);this._delay=null;if(this._settleTimer)clearTimeout(this._settleTimer);this._settleTimer=null},
    restart(fromLoop){
      const run=this._runId=(this._runId||0)+1;this.stop();if(!this._attached)return
      const name=this.sceneName(),meta=META[name],app=getApp&&getApp(),still=this.properties.motion==='still'||!!(app&&app.globalData&&app.globalData.reduceMotion)||!this._visible
      const base={label:meta[1],fallbackSrc:'/assets/xingcheng-q/formal/'+meta[0],canvasReady:true,canvasShown:false,settling:false}
      if(still){this.release();this.setData(Object.assign(base,{settled:true}));return}
      if(!this._ready||this.data.settled){this.release();this.setData(Object.assign(base,{settled:false}),()=>wx.nextTick(()=>this.init(fromLoop,run)));return}
      this.begin(name,fromLoop,run)
    },
    init(fromLoop,run){
      if(run!==this._runId||!this._attached||!this._visible||this.data.settled)return
      this.createSelectorQuery().select('#sceneCanvas').fields({node:true,size:true}).exec(res=>{
        if(run!==this._runId)return
        const name=this.sceneName()
        try{
          const item=res&&res[0];if(!item||!item.node){this.fail(name,run);return}
          const dpr=Math.min(2,wx.getWindowInfo?wx.getWindowInfo().pixelRatio:wx.getSystemInfoSync().pixelRatio)
          this._canvas=item.node;this._ctx=item.node.getContext('2d');if(!this._ctx){this.fail(name,run);return}
          item.node.width=Math.max(1,Math.round(item.width*dpr));item.node.height=Math.max(1,Math.round(item.height*dpr));this._ctx.setTransform(item.node.width/512,0,0,item.node.height/512,0,0)
          this._ready=true;this.begin(name,fromLoop,run)
        }catch(e){this.fail(name,run)}
      })
    },
    begin(name,fromLoop,run){
      if(run!==this._runId)return
      try{this._scene=BUILDERS[name](this._canvas);this.play(name,META[name][2],run)}catch(e){this.fail(name,run)}
    },
    settle(name,run){
      if(run!==this._runId)return;const meta=META[name];this.release();if(this._attached)this.setData({settled:true,canvasShown:false,settling:false,canvasReady:true,fallbackSrc:'/assets/xingcheng-q/formal/'+meta[0],label:meta[1]});this.triggerEvent('playend',{scene:name})
    },
    play(name,duration,run){
      const started=Date.now(),scene=this._scene,canvas=this._canvas;this._lastDrawAt=0
      const tick=()=>{try{
        if(run!==this._runId||!this._attached||!this._visible)return
        const now=Date.now(),t=(now-started)/1000
        if(!this._lastDrawAt||now-this._lastDrawAt>=FRAME_MS||t>=duration){this._lastDrawAt=now;scene.timeline.seek(Math.min(t,scene.timeline.duration()));if(!this.data.canvasShown)this.setData({canvasShown:true})}
        if(t>=duration){this._raf=null;if(name==='loading'||name==='waiting'||!this.properties.once){this.triggerEvent('playend',{scene:name});this._delay=setTimeout(()=>{if(run===this._runId&&this._visible)this.restart(true)},name==='waiting'?4000:40)}else this.settle(name,run);return}
        this._raf=canvas.requestAnimationFrame(tick)
      }catch(e){this.fail(name,run)}}
      this._raf=canvas.requestAnimationFrame(tick)
    }
  }
})
