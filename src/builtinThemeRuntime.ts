import {
  executeInTab, fetchNoCors, injectCssIntoTab, removeCssFromTab,
} from "@decky/api";
import { identifySteamTabs, type ThemeScope } from "./themeTabs";
import { compileMidnightCss } from "./themeCssCompiler";

export type ThemeId = "midnight" | "off";
export type ThemeBundle = {
  id: "midnight";
  name: string;
  css: Record<ThemeScope,string>;
};
export type ThemeStatus = {
  selected:ThemeId;
  appliedTabs:number;
  hasMain:boolean;
  hasMenu:boolean;
  hasQAM:boolean;
  issue:string;
};

const RECHECK_MS = 6500;
const TIMEOUT_MS = 3000;
const DEBUG_TABS_URL = "http://localhost:8080/json";
// Marker is scoped to the actual Steam document, not our React dashboard.
const MARKER = "--game-library-midnight-active";
// Version the marker so Steam cannot mistakenly keep last release's CSS
// after an in-place Decky update (the old style node survives hot reload).
const STYLE_REVISION = "41";
const markerCss = `\n:root { ${MARKER}: ${STYLE_REVISION}; }\n`;
const checkMarker = `(() => getComputedStyle(document.documentElement).getPropertyValue('${MARKER}').trim())()`;
const CLEANUP_SCRIPT = `(() => {
  for (const element of document.querySelectorAll("style")) {
    if (element.textContent?.includes("--game-library-midnight-active:")) element.remove();
  }
})()`;

type TabRecord={cssId:string;scope:ThemeScope;signature:number};
/** Noncryptographic signature used only to identify CSS versions/class-alias changes. */
function cssSignature(text:string):number {
  let result=2166136261;
  for(let index=0;index<text.length;index++)
    result=Math.imul(result^text.charCodeAt(index),16777619);
  return result>>>0;
}
const managedTabs=new Map<string,TabRecord>();
const listeners=new Set<(next:ThemeStatus)=>void>();
let theme:ThemeBundle|null=null;
let desired:ThemeId="off";
let shuttingDown=false;
let generation=0;
let timer:ReturnType<typeof setInterval>|null=null;
let chain=Promise.resolve();
let status:ThemeStatus={
  selected:"off",appliedTabs:0,hasMain:false,hasMenu:false,hasQAM:false,issue:"",
};

export function themeRuntimeStatus():ThemeStatus{return {...status};}
export function subscribeThemeStatus(listener:(next:ThemeStatus)=>void):()=>void {
  listeners.add(listener);
  listener(themeRuntimeStatus());
  return ()=>listeners.delete(listener);
}
function report(patch:Partial<ThemeStatus>) {
  status={...status,...patch};
  for(const cb of listeners)cb(themeRuntimeStatus());
}
function bounded<T>(value:PromiseLike<T>|T,timeout=TIMEOUT_MS):Promise<T> {
  let timerId:ReturnType<typeof setTimeout>|undefined;
  const timeoutPromise=new Promise<T>((_,reject)=>{
    timerId=setTimeout(()=>reject(new Error("Steam browser operation timed out")),timeout);
  });
  return Promise.race([Promise.resolve(value),timeoutPromise]).finally(()=>{
    if(timerId!==undefined)clearTimeout(timerId);
  });
}

async function listTabs():Promise<Array<{title:string;scope:ThemeScope}>> {
  try{
    const response=await bounded(fetchNoCors(DEBUG_TABS_URL));
    if(response.ok){
      const parsed=identifySteamTabs(await bounded(response.json()));
      if(parsed.length)return parsed;
    }
  }catch{ /* Steam remote tab discovery can be temporarily unavailable */ }
  // The default Game Mode page is accessible by this Decky tab title.
  // We do not guess ephemeral QAM or Steam Menu titles if discovery fails.
  return [{title:"Steam Big Picture Mode",scope:"main"}];
}

async function activeInTab(title:string):Promise<boolean> {
  try{
    const r=await bounded(executeInTab(title,false,checkMarker));
    return r.success && String(r.result).trim()===STYLE_REVISION;
  }catch{return false;}
}

async function removeKnown(title:string){
  const entry=managedTabs.get(title);
  if(!entry)return;
  managedTabs.delete(title);
  try{
    await bounded(removeCssFromTab(title,entry.cssId) as unknown as Promise<void>|void);
  }catch{ /* tab may have been destroyed */ }
}

function queue<T>(job:()=>Promise<T>):Promise<T> {
  const work=chain.then(job);
  chain=work.then(()=>undefined,()=>undefined);
  return work;
}

async function applyToTab(
  title:string,scope:ThemeScope,epoch:number,
):Promise<void> {
  if(shuttingDown||desired!=="midnight"||epoch!==generation||!theme)return;
  // CSS modules may finish loading when Settings or game-details is opened.
  // Compile live Steam class aliases on each check, then re-inject only if
  // the mapping changed. This allows themed pages to work after lazy loads.
  const css=compileMidnightCss(theme.css[scope])+markerCss;
  const signature=cssSignature(css);
  const previous=managedTabs.get(title);
  // Steam can rebuild QAM/Home's DOM without changing the DevTools tab title.
  if(previous?.signature===signature && previous.scope===scope &&
     await activeInTab(title))return;
  // Remove previously injected CSS (including the incomplete older release)
  // and replace it with the current selector and style revision.
  await removeKnown(title);
  try{await bounded(executeInTab(title,false,CLEANUP_SCRIPT));}
  catch{/* Steam may have rebuilt the tab while we were checking. */}
  if(shuttingDown||desired!=="midnight"||epoch!==generation||!theme)return;
  try{
    // API typings return string, but the Decky backend may return a Promise.
    const cssId=await bounded(injectCssIntoTab(title,css) as unknown as Promise<string>|string);
    if(typeof cssId!=="string"||cssId.length<8)throw new Error("Invalid style identifier");
    if(shuttingDown||desired!=="midnight"||epoch!==generation){
      try{await bounded(removeCssFromTab(title,cssId) as unknown as Promise<void>|void);}
      catch{/* tab may have disappeared */}
      return;
    }
    managedTabs.set(title,{cssId,scope,signature});
  }catch(e){
    // Keep the theme enabled and retry when Steam opens the menu again.
    console.warn("[game-library] theme injection deferred for",title,e);
  }
}

async function syncTheme():Promise<void>{
  if(shuttingDown||desired!=="midnight"||!theme)return;
  const epoch=generation;
  const tabs=await listTabs();
  for(const tab of tabs) {
    if(shuttingDown||desired!=="midnight"||epoch!==generation)break;
    await applyToTab(tab.title,tab.scope,epoch);
  }
  if(epoch!==generation)return;
  const actual=new Set(tabs.map(x=>x.title));
  const main=tabs.some(t=>t.scope==="main"&&managedTabs.has(t.title));
  const qam=tabs.some(t=>t.title.startsWith("QuickAccess")&&managedTabs.has(t.title));
  const menu=tabs.some(t=>t.title.startsWith("MainMenu")&&managedTabs.has(t.title));
  report({
    appliedTabs:[...managedTabs.keys()].filter(t=>actual.has(t)).length,
    hasMain:main,hasQAM:qam,hasMenu:menu,
    issue:main?"": "Waiting for Steam Game Mode browser to become available",
  });
}

async function cleanup():Promise<void> {
  const previous=[...managedTabs.keys()];
  for(const title of previous)await removeKnown(title);
  // Remove any orphaned Midnight styles created by a previous plugin
  // instance after a hot-reload. Only styles with our unique marker match.
  const tabs=await listTabs();
  for(const {title} of tabs){
    try{await bounded(executeInTab(title,false,CLEANUP_SCRIPT));}
    catch{/* browser may have closed */}
  }
  report({appliedTabs:0,hasMain:false,hasMenu:false,hasQAM:false,issue:""});
}

function stopTimer(){
  if(timer!==null){clearInterval(timer);timer=null;}
}
function startTimer(){
  if(timer===null)timer=setInterval(()=>{void queue(syncTheme);},RECHECK_MS);
}

export async function setBuiltinTheme(
  id:ThemeId,bundle?:ThemeBundle,
):Promise<void>{
  if(shuttingDown)return;
  if(id==="midnight"&&bundle)theme=bundle;
  if(id==="midnight"&&!theme)throw new Error("Midnight CSS has not loaded");
  if(desired===id&&status.appliedTabs>0&&id==="midnight")return;
  ++generation;
  desired=id;
  report({selected:id,issue:""});
  if(id==="off"){
    stopTimer();
    await queue(cleanup);
  }else {
    startTimer();
    await queue(syncTheme);
  }
}

export function startBuiltInThemeRuntime(){
  shuttingDown=false;
  desired="off";
  generation++;
  report({selected:"off",issue:""});
}
export function stopBuiltInThemeRuntime(){
  ++generation;
  shuttingDown=true;
  desired="off";
  stopTimer();
  void queue(cleanup).catch(e=>
    console.warn("[game-library] theme cleanup failed",e));
}
