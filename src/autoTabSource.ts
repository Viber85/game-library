import {callable} from "@decky/api";
import {getActiveUserId} from "./steam";
import {DEFAULT_LIBRARY_TABS,type LibraryTab} from "./libraryTabs";
import {createSourceRefresh} from "./tabSourceRefresh";

/** Game Library's own tab definitions and private backend persistence. */
export type AutoTabSnapshot={
  available:boolean;
  reason:string;
  tabs:LibraryTab[];
  mode:"native";
};
type TabReply={ok:boolean;reason?:string;tabs?:LibraryTab[]};
const loadTabs=callable<[string],TabReply>("get_library_tabs");
const persistTabs=callable<[string,LibraryTab[]],TabReply>("save_library_tabs");

const initial:AutoTabSnapshot={
  available:true,reason:"Waiting for Steam account",tabs:DEFAULT_LIBRARY_TABS,
  mode:"native",
};
async function readLibraryTabs():Promise<AutoTabSnapshot>{
  const account=getActiveUserId();
  if(!account)return initial;
  const saved=await loadTabs(account);
  return saved?.ok&&Array.isArray(saved.tabs)?
    {available:true,reason:"",tabs:saved.tabs,mode:"native"}:
    {available:true,reason:saved?.reason??"Unable to read saved tabs",
     tabs:DEFAULT_LIBRARY_TABS,mode:"native"};
}
const sync=createSourceRefresh<AutoTabSnapshot>(
  readLibraryTabs,initial,
  state=>JSON.stringify([state.reason,state.tabs,state.mode]),
);

const POLL_MS=4000;
const WAKE_THROTTLE_MS=1750;
let running=false;
let interval:number|undefined;
let followUp:number|undefined;
let lastWake=0;

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

export async function saveOwnTabs(tabs:LibraryTab[]):Promise<void>{
  const account=getActiveUserId();
  if(!account)throw new Error("Wait until the Steam account is ready");
  const reply=await persistTabs(account,tabs);
  if(!reply?.ok)throw new Error(reply?.reason||"Saving tabs failed");
  await sync.refresh();
}
