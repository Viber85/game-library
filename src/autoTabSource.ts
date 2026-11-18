import { getActiveUserId } from "./steam";
import { loadSteamTabs, type SteamTab } from "./tabmaster";
import { createSourceRefresh } from "./tabSourceRefresh";

export type AutoTabSnapshot={
  available:boolean;
  reason:string;
  tabs:SteamTab[];
  mode?:string;
};

const initial:AutoTabSnapshot={
  available:false,reason:"Checking TabMaster status…",tabs:[],mode:"auto"
};
const sync=createSourceRefresh<AutoTabSnapshot>(
  ()=>loadSteamTabs(getActiveUserId()),
  initial,
  state=>JSON.stringify([state.available,state.reason,state.tabs,state.mode]),
);

const POLL_MS=4000;
const WAKE_THROTTLE_MS=1750;
let running=false;
let interval:number|undefined;
let followUp:number|undefined;
let lastWake=0;

/** The Steam QAM keeps Game Mode on the same page. On returning from QAM,
 * focusin may fire even when window.focus/visibilitychange do not. A delayed
 * second read covers TabMaster/UnifiedDeck mounting their Steam collections
 * after Decky removes them from disabled_plugins.
 */
function onWake(){
  if(!running)return;
  const now=Date.now();
  if(now-lastWake<WAKE_THROTTLE_MS)return;
  lastWake=now;
  void sync.refresh();
  if(followUp!==undefined)window.clearTimeout(followUp);
  followUp=window.setTimeout(()=>{
    followUp=undefined;
    if(running)void sync.refresh();
  },1200);
}
function onVisible(){
  if(document.visibilityState==="visible")onWake();
}

export function startAutoTabSource(){
  if(running)return;
  running=true;
  lastWake=0;
  sync.start();
  interval=window.setInterval(()=>{void sync.refresh();},POLL_MS);
  window.addEventListener("focus",onWake);
  window.addEventListener("pageshow",onWake);
  document.addEventListener("focusin",onWake);
  document.addEventListener("visibilitychange",onVisible);
}

export function stopAutoTabSource(){
  if(!running)return;
  running=false;
  window.removeEventListener("focus",onWake);
  window.removeEventListener("pageshow",onWake);
  document.removeEventListener("focusin",onWake);
  document.removeEventListener("visibilitychange",onVisible);
  if(interval!==undefined)window.clearInterval(interval);
  if(followUp!==undefined)window.clearTimeout(followUp);
  interval=followUp=undefined;
  sync.stop();
}

export const getAutoTabs=()=>sync.getSnapshot();
export const subscribeAutoTabs=(listener:(value:AutoTabSnapshot)=>void)=>
  sync.subscribe(listener);
