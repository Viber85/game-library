import {
  executeInTab, fetchNoCors, injectCssIntoTab, removeCssFromTab,
} from "@decky/api";
import { identifySteamTabs, FALLBACK_MAIN_TITLES, type ThemeScope, type SteamTab } from "./themeTabs";
import { STEAM_PAGE_CHECK_SCRIPT, THEME_PROBE_SCRIPT, parseThemeProbe, type ThemeProbe } from "./themeProbe";
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
export type ThemeDiagnostics={
  target:string;
  discoveredTabs:number;
  detectedVisibleUI:boolean;
  applied:boolean;
  themeMarker:string;
  cssSheets:number;
  settingsRoots:number;
  settingsFields:number;
  networkRows:number;
  gameRoots:number;
  gameSections:number;
  computedFieldColor:string;
  computedRootColor:string;
  sampleClasses:string[];
  details:string;
};

const RECHECK_MS = 6500;
const TIMEOUT_MS = 3000;
const DEBUG_TABS_URL = "http://localhost:8080/json";
// Marker is scoped to the actual Steam document, not our React dashboard.
const MARKER = "--game-library-midnight-active";
// Version the marker so Steam cannot mistakenly keep last release's CSS
// after an in-place Decky update (the old style node survives hot reload).
const STYLE_REVISION = "42";
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

async function listTabs():Promise<SteamTab[]> {
  try{
    const response=await bounded(fetchNoCors(DEBUG_TABS_URL));
    if(response.ok){
      const parsed=identifySteamTabs(await bounded(response.json()));
      if(parsed.length)return parsed;
    }
  }catch(error){
    console.warn("[game-library] CEF tab discovery unavailable",error);
  }
  // Never invent a Steam target title. Previous versions counted a generated
  // CSS UUID against a guessed "Steam Big Picture Mode" tab as success, even
  // when the actual visible Steam tab was named Steam/SP or localized.
  // Probe a fixed allowlist and *verify it actually has the Steam Game Mode DOM*.
  for(const title of FALLBACK_MAIN_TITLES){
    try{
      const value=await bounded(executeInTab(title,false,STEAM_PAGE_CHECK_SCRIPT));
      if(value.success && value.result===true)return [{title,scope:"main"}];
    }catch{ /* move to next known title */ }
  }
  return [];
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
    // CSS injection's UUID alone is not proof that Steam applied it.
    // Check the actual document marker before claiming a styled tab.
    const verified=await activeInTab(title);
    if(!verified){
      try{await bounded(removeCssFromTab(title,cssId) as unknown as Promise<void>|void);}
      catch{/* Steam may have replaced the document */}
      console.warn("[game-library] CSS was accepted but did not appear in",title);
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
  // These counts represent verified marker-bearing Steam tabs, not merely
  // successful API requests or CSS content compiled inside Decky.
  const main=tabs.some(t=>t.scope==="main"&&managedTabs.has(t.title));
  const qam=tabs.some(t=>t.title.startsWith("QuickAccess")&&managedTabs.has(t.title));
  const menu=tabs.some(t=>t.title.startsWith("MainMenu")&&managedTabs.has(t.title));
  report({
    appliedTabs:[...managedTabs.keys()].filter(t=>actual.has(t)).length,
    hasMain:main,hasQAM:qam,hasMenu:menu,
    issue:main?"": tabs.length===0
      ?"Steam Game Mode tab not discovered. Run Theme Diagnostics from Appearance."
      :"CSS not verified in the visible Steam UI. Run Theme Diagnostics.",
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


/** Read-only on-device validation. Reports both injection and whether the
 * user's *actual* Settings / Game Details elements exist in that document.
 * No SSIDs, game titles, usernames, input values or web content is read.
 */
export async function runThemeDiagnostics():Promise<ThemeDiagnostics>{
  return queue(async()=>{
    if(!shuttingDown&&desired==="midnight"&&theme)await syncTheme();
    const tabs=await listTabs();
    const main=tabs.find(t=>t.scope==="main");
    const empty:ThemeDiagnostics={
      target:main?.title??"Not found",
      discoveredTabs:tabs.length,
      detectedVisibleUI:false,
      applied:false,
      themeMarker:"",
      cssSheets:0,settingsRoots:0,settingsFields:0,networkRows:0,
      gameRoots:0,gameSections:0,computedFieldColor:"",
      computedRootColor:"",sampleClasses:[],
      details:main?"Unable to inspect Steam UI.":"No Steam Game Mode tab could be verified.",
    };
    if(!main)return empty;
    let probe:ThemeProbe|null=null;
    try{
      const execution=await bounded(executeInTab(main.title,false,THEME_PROBE_SCRIPT));
      if(execution.success)probe=parseThemeProbe(execution.result);
      else empty.details="Decky could not execute a read-only CSS inspection.";
    }catch(error){empty.details="Steam CSS inspection failed: "+String(error).slice(0,140);}
    if(!probe)return empty;
    const applied=probe.marker===STYLE_REVISION && probe.sheets>0;
    const onSettings=probe.settingsRoots>0;
    const onGame=probe.gameRoots>0;
    let details= !probe.visibleUI?"The selected CEF tab is not the visible Steam UI.":
      !applied?"Midnight CSS is missing from the visible Steam document.":
      onSettings&&probe.fieldRows===0
        ?"Midnight CSS exists, but no Settings row selectors match this Steam build.":
      onGame&&probe.gameSections===0
        ?"Midnight CSS exists, but no Game Details section selectors match this Steam build.":
      !onSettings&&!onGame
        ?"Theme injection verified. Open Settings or a game page and run this check again.":
      "Theme CSS is present; these are the actual Steam element counts.";
    return {
      target:main.title,discoveredTabs:tabs.length,
      detectedVisibleUI:probe.visibleUI,applied,
      themeMarker:probe.marker,cssSheets:probe.sheets,
      settingsRoots:probe.settingsRoots,settingsFields:probe.fieldRows,
      networkRows:probe.networkRows,gameRoots:probe.gameRoots,
      gameSections:probe.gameSections,computedFieldColor:probe.fieldColor,
      computedRootColor:probe.rootColor,sampleClasses:probe.sampleClasses,
      details,
    };
  });
}

/** Retry injection after Steam changes routes or after plugin hot reload.
 * This never changes saved theme preferences. */
export async function refreshBuiltinTheme():Promise<void>{
  await queue(async()=>{
    if(shuttingDown||desired!=="midnight")return;
    const tabs=await listTabs();
    for(const t of tabs)await removeKnown(t.title);
    await syncTheme();
  });
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
