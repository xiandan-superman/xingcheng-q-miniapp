const Theater=require('./core')
const Sleep=require('./sleep')
const DURATIONS={idle:8.2,sleep:21.5,snack:15.8,asteroid:15.8}
const FRAME_MS=32
const CSS_END=3.95

Component({
  properties:{size:{type:Number,value:320},motion:{type:String,value:'auto',observer(){this.restart()}},playToken:{type:null,value:0,observer(){this.restart()}}},
  data:{phase:'fallback',canvasReady:true},
  lifetimes:{attached(){this._visible=true;this._initAttempts=0},ready(){this.init()},detached(){this.stop();if(this._initTimer)clearTimeout(this._initTimer);this._initTimer=null}},
  pageLifetimes:{show(){this._visible=true;if(this._ready)this.restart()},hide(){this._visible=false;this.stop()}},
  methods:{
    stop(){if(this._phaseTimer)clearTimeout(this._phaseTimer);this._phaseTimer=null;if(this._canvas&&this._raf)this._canvas.cancelAnimationFrame(this._raf);this._raf=null},
    fail(){this.stop();this._ready=false;this.setData({canvasReady:false,phase:'fallback'})},
    init(){this.createSelectorQuery().select('#homeCanvas').fields({node:true,size:true}).exec(res=>{try{const item=res&&res[0];if(!item||!item.node||!item.width||!item.height){if((this._initAttempts||0)<4){this._initAttempts=(this._initAttempts||0)+1;this._initTimer=setTimeout(()=>{this._initTimer=null;this.init()},60);return}this.fail();return}const dpr=Math.min(2,wx.getWindowInfo?wx.getWindowInfo().pixelRatio:wx.getSystemInfoSync().pixelRatio);this._canvas=item.node;const ctx=item.node.getContext('2d');if(!ctx){this.fail();return}item.node.width=Math.max(1,Math.round(item.width*dpr));item.node.height=Math.max(1,Math.round(item.height*dpr));ctx.setTransform(item.node.width/512,0,0,item.node.height/512,0,0);this._ready=true;this.restart()}catch(e){this.fail()}})},
    restart(){this.stop();if(!this._ready)return;const app=getApp&&getApp(),still=this.properties.motion==='still'||!!(app&&app.globalData&&app.globalData.reduceMotion)||!this._visible;if(still){this.setData({phase:'fallback'});return}this._idleLeft=1;this.playIdle()},
    playIdle(){this.stop();if(!this._ready||!this._visible)return;this.setData({phase:'css'});this._phaseTimer=setTimeout(()=>this.playIdleCanvas(),CSS_END*1000)},
    playIdleCanvas(){this._phaseTimer=null;this.playCanvasMode('idle',CSS_END)},
    playCanvasMode(mode,startAt=0){this.stop();try{this._scene=mode==='sleep'?Sleep.create(this._canvas):Theater.create(this._canvas,mode);this._scene.timeline.seek(startAt);const duration=DURATIONS[mode],started=Date.now()-startAt*1000;this._lastDrawAt=0;this.setData({phase:'canvas'});const tick=()=>{const now=Date.now(),t=(now-started)/1000;if(!this._lastDrawAt||now-this._lastDrawAt>=FRAME_MS||t>=duration){this._lastDrawAt=now;this._scene.timeline.seek(Math.min(t,this._scene.timeline.duration()))}if(t>=duration){this._raf=null;this.next(mode);return}this._raf=this._canvas.requestAnimationFrame(tick)};this._raf=this._canvas.requestAnimationFrame(tick)}catch(e){this.fail()}},
    next(mode){if(!this._visible)return;if(mode==='idle'&&--this._idleLeft>0){this.playIdle();return}if(mode==='idle'){const choices=['sleep','snack','asteroid'].filter(x=>x!==this._last);const pick=choices[Math.floor(Math.random()*choices.length)];this._last=pick;this.playCanvasMode(pick);return}this._idleLeft=1+Math.floor(Math.random()*3);this.playIdle()}
  }
})
