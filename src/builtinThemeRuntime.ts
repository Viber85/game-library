import {
  executeInTab, fetchNoCors, injectCssIntoTab, removeCssFromTab,
} from "@decky/api";
import { identifySteamTabs, fallbackMainTitlesPresent, FALLBACK_MAIN_TITLES, type ThemeScope, type SteamTab } from "./themeTabs";
import {
  STEAM_PAGE_CHECK_SCRIPT, THEME_PROBE_SCRIPT, parseThemeProbe, type ThemeProbe,
  THEME_AUDIT_INSTALL_SCRIPT, THEME_AUDIT_READ_SCRIPT,
  THEME_AUDIT_REMOVE_SCRIPT, parseThemeAudit, latestThemePage, type ThemeDomEvidence, type ThemeFocusFrame,
} from "./themeProbe";
import { createMidnightCssCompiler } from "./themeCssCompiler";
import {sameThemeRuntimeStatus} from "./themeCycleCache";
import {COMPACT_DETAILS_INSTALL_SCRIPT,COMPACT_DETAILS_REMOVE_SCRIPT} from "./compactDetailsDom";
import {nativeCompactHintsFromCss,compactHintsInjection} from "./compactDetailsAnchors";

export type ThemeId = "midnight" | "off";
export type ThemeBundle = {
  id: "midnight";
  name: string;
  css: Record<ThemeScope,string>;
  compact_css?:string;
};
export type ThemeStatus = {
  selected:ThemeId;
  compactDetails:boolean;
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
  domEvidence:ThemeDomEvidence[];
  focusTrace:ThemeFocusFrame[];
  focusAnomalies:ThemeFocusFrame[];
  specialSettingsRows:number;
  specialSettingsRowColor:string;
  deckySettingsActive:boolean;
  deckyObservedDom:boolean;
  deckyLiveCssMatched:boolean;
  deckyFieldRows:number;
  deckyFieldColor:string;
  gameRoots:number;
  gameSections:number;
  compactEnabled:boolean;
  compactCssLoaded:boolean;
  compactStyleActive:boolean;
  compactPosterShown:boolean;
  compactMatchedRecently:boolean;
  compactMatchAgeSeconds:number;
  libraryUIVisible:boolean;
  nativeHeaderCount:number;
  nativePlayBarCount:number;
  nativeHeroFound:boolean;
  nativePlayBarFound:boolean;
  nativeHeroStyled:boolean;
  nativePlayBarStyled:boolean;
  nativeHeroHeight:number;
  nativePlayBarHeight:number;
  nativeAliasesResolved:number;
  nativeStyledRecently:boolean;
  nativeStyleAgeSeconds:number;
  computedFieldColor:string;
  computedRootColor:string;
  sampleClasses:string[];
  colorSamples:Array<{color:string;count:number;className:string}>;
  surfaceElements:number;
  detectedRoute:string;
  watcherRunning:boolean;
  watcherTicks:number;
  watcherAgeSeconds:number;
  captureSource:"live"|"before-qam"|"none";
  capturedPage:string;
  captureAgeSeconds:number;
  details:string;
};

const RECHECK_MS = 6500;
const TIMEOUT_MS = 3000;
const DEBUG_TABS_URL = "http://localhost:8080/json";
// Marker is scoped to the actual Steam document, not our React dashboard.
const MARKER = "--game-library-midnight-active";
// Version the marker so Steam cannot mistakenly keep last release's CSS
// after an in-place Decky update (the old style node survives hot reload).
const STYLE_REVISION = "85";
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
let compactDetails=false;
let shuttingDown=false;
let generation=0;
let timer:ReturnType<typeof setInterval>|null=null;
let chain=Promise.resolve();
let status:ThemeStatus={
  selected:"off",compactDetails:false,appliedTabs:0,hasMain:false,hasMenu:false,hasQAM:false,issue:"",
};

export function themeRuntimeStatus():ThemeStatus{return {...status};}
export function subscribeThemeStatus(listener:(next:ThemeStatus)=>void):()=>void {
  listeners.add(listener);
  listener(themeRuntimeStatus());
  return ()=>listeners.delete(listener);
}
function report(patch:Partial<ThemeStatus>) {
  const next={...status,...patch};
  if(sameThemeRuntimeStatus(status,next))return;
  status=next;
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
      const listed=await bounded(response.json());
      const parsed=identifySteamTabs(listed);
      if(parsed.length){
        const checked:SteamTab[]=[];
        for(const tab of parsed) {
          if(tab.scope==="overlay"){checked.push(tab);continue;}
          // The Steam CEF list can contain an off-screen SharedJSContext/SP.
          // Don't count that as the visible Game Mode page without DOM proof.
          try{
            const value=await bounded(executeInTab(tab.title,false,STEAM_PAGE_CHECK_SCRIPT),1500);
            if(value.success&&value.result===true)checked.push(tab);
          }catch{ /* ephemeral CEF tab: skip and retry next cycle */ }
        }
        // A valid Steam native UI tab can have a blank/opaque DevTools URL.
        // Previously we returned after the FIRST main tab and skipped these
        // listed alternatives, potentially styling only the plugin's route.
        // Probe only titles ACTUALLY listed by CEF, and require the real DOM.
        for(const title of fallbackMainTitlesPresent(listed)){
          if(checked.some(t=>t.title===title))continue;
          try{
            const result=await bounded(executeInTab(title,false,STEAM_PAGE_CHECK_SCRIPT),1500);
            if(result.success&&result.result===true)
              checked.push({title,scope:"main"});
          }catch{ /* ephemeral or offscreen CEF tab: skip */ }
        }
        return checked;
      }
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

async function syncCompactDetailsDom(title:string,enabled:boolean,
  compiledCss=""):Promise<void>{
  try{
    const script=enabled?
      compactHintsInjection(nativeCompactHintsFromCss(compiledCss))+
      COMPACT_DETAILS_INSTALL_SCRIPT:COMPACT_DETAILS_REMOVE_SCRIPT;
    await bounded(executeInTab(title,false,script),1600);
  }catch{
    // Native Steam UI can recreate its document as the route changes.
    // Recheck on the next theme cycle; never alter controller focus.
  }
}

async function ensureThemeAudit(title:string):Promise<void>{
  try{
    const response=await bounded(executeInTab(title,false,THEME_AUDIT_INSTALL_SCRIPT));
    if(!response.success||response.result!==true)
      console.warn("[game-library] Native Steam CSS watcher could not start in",title);
  }catch(error){
    console.warn("[game-library] Unable to install native Steam CSS watcher",error);
  }
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
  title:string,scope:ThemeScope,epoch:number,css:string,
):Promise<void> {
  if(shuttingDown||desired!=="midnight"||epoch!==generation||!theme)return;
  // The CSS is compiled once per scope per cycle from live Steam classes.
  // Atomic replacement and marker verification below are unchanged.
  const signature=cssSignature(css);
  const previous=managedTabs.get(title);
  // Steam can rebuild QAM/Home's DOM without changing the DevTools tab title.
  if(previous?.signature===signature && previous.scope===scope &&
     await activeInTab(title)){
    if(scope==="main"){
      await syncCompactDetailsDom(title,compactDetails,css);
      await ensureThemeAudit(title);
    }
    return;
  }
  // Never uninstall a WORKING stylesheet before its replacement is
  // injected. Removing first caused a native-color flash whenever a Steam
  // Settings category lazy-loaded another CSS module. Keep the old sheet
  // active until the new sheet has been accepted and verified.
  if(!previous){
    // First installation / hot-reload can have orphaned prior-version CSS.
    if(scope==="main")await syncCompactDetailsDom(title,false);
    try{await bounded(executeInTab(title,false,CLEANUP_SCRIPT));}
    catch{/* Steam may have rebuilt the tab while we were checking. */}
  }
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
    // Now that the new rules are already active, remove the old copy.
    // A brief CSS overlap is preferable to even one unthemed frame.
    if(previous && previous.cssId!==cssId){
      try{await bounded(removeCssFromTab(title,previous.cssId) as unknown as Promise<void>|void);}
      catch{/* Previous Steam document or CSS node may no longer exist. */}
    }
    if(scope==="main"){
      await syncCompactDetailsDom(title,compactDetails,css);
      await ensureThemeAudit(title);
    }
  }catch(e){
    // Keep the theme enabled and retry when Steam opens the menu again.
    console.warn("[game-library] theme injection deferred for",title,e);
  }
}

async function syncTheme():Promise<void>{
  if(shuttingDown||desired!=="midnight"||!theme)return;
  const epoch=generation;
  const tabs=await listTabs();
  // Steam CSS class modules may lazy-load when Settings/Game Details opens:
  // rescan on every sync, but share that snapshot across main/QAM/Menu tabs.
  // The compiled CSS is reused while its live alias signature is identical.
  const compile=tabs.length?createMidnightCssCompiler():null;
  const cssByScope=new Map<ThemeScope,string>();
  for(const tab of tabs) {
    if(shuttingDown||desired!=="midnight"||epoch!==generation)break;
    let css=cssByScope.get(tab.scope);
    if(css===undefined){
      const source=theme.css[tab.scope]+(tab.scope==="main"&&compactDetails
        ? "\n"+(theme.compact_css??""):"");
      css=compile!(source)+markerCss;
      cssByScope.set(tab.scope,css);
    }
    await applyToTab(tab.title,tab.scope,epoch,css);
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
  for(const {title,scope} of tabs){
    if(scope==="main")await syncCompactDetailsDom(title,false);
    try{await bounded(executeInTab(title,false,CLEANUP_SCRIPT));}
    catch{/* browser may have closed */}
    if(scope==="main"){
      try{await bounded(executeInTab(title,false,THEME_AUDIT_REMOVE_SCRIPT));}
      catch{/* browser may have closed */}
    }
  }
  report({appliedTabs:0,hasMain:false,hasMenu:false,hasQAM:false,issue:""});
}

function stopTimer(){
  if(timer!==null){clearInterval(timer);timer=null;}
}
function startTimer(){
  if(timer===null)timer=setInterval(()=>{void queue(syncTheme);},RECHECK_MS);
}

/** Apply user opt-in to native Steam details only. The same compiled CSS
 * pipeline resolves Steam's current hashed class names; atomic replacement
 * never unmounts Steam's buttons, tabs or focus handlers. */
export async function setCompactDetailsMode(enabled:boolean):Promise<void>{
  if(shuttingDown)return;
  if(enabled&&theme&&!theme.compact_css)
    throw new Error("Compact details CSS is missing from the installed ZIP.");
  if(compactDetails===enabled)return;
  compactDetails=enabled;
  ++generation;
  report({compactDetails:enabled});
  if(desired==="midnight"&&theme)await queue(syncTheme);
  else if(!enabled){
    const tabs=await listTabs();
    for(const t of tabs.filter(t=>t.scope==="main"))
      await syncCompactDetailsDom(t.title,false);
  }
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
    const mainCandidates=tabs.filter(t=>t.scope==="main");
    let main=mainCandidates[0];
    const empty:ThemeDiagnostics={
      target:main?.title??"Not found",
      discoveredTabs:tabs.length,
      detectedVisibleUI:false,
      applied:false,
      themeMarker:"",
      cssSheets:0,settingsRoots:0,settingsFields:0,networkRows:0,
      domEvidence:[],focusTrace:[],focusAnomalies:[],specialSettingsRows:0,specialSettingsRowColor:"",
      deckySettingsActive:false,deckyObservedDom:false,deckyLiveCssMatched:false,
      deckyFieldRows:0,deckyFieldColor:"",
      gameRoots:0,gameSections:0,compactEnabled:compactDetails,
      compactCssLoaded:false,compactStyleActive:false,compactPosterShown:false,
      compactMatchedRecently:false,compactMatchAgeSeconds:-1,
      libraryUIVisible:false,nativeHeaderCount:0,nativePlayBarCount:0,
      nativeHeroFound:false,nativePlayBarFound:false,
      nativeHeroStyled:false,nativePlayBarStyled:false,
      nativeHeroHeight:0,nativePlayBarHeight:0,nativeAliasesResolved:0,
      nativeStyledRecently:false,nativeStyleAgeSeconds:-1,
      computedFieldColor:"",
      computedRootColor:"",sampleClasses:[],
      colorSamples:[],surfaceElements:0,detectedRoute:"other",
      watcherRunning:false,watcherTicks:0,watcherAgeSeconds:0,
      captureSource:"none",capturedPage:"",captureAgeSeconds:0,
      details:main?"Unable to inspect Steam UI.":"No Steam Game Mode tab could be verified.",
    };
    if(!main)return empty;
    // Multiple real Steam CEF documents can exist. The former Quick Check
    // read only the FIRST tab and could report the plugin route while the
    // native Details page was mounted in a different verified Steam tab.
    // Inspect each verified main tab; prefer live native-game evidence, then
    // its recent read-only pre-QAM snapshot. Never select by tab title alone.
    let probe:ThemeProbe|null=null;
    let bestScore=-1;
    for(const candidate of mainCandidates){
      try{
        const execution=await bounded(executeInTab(candidate.title,false,THEME_PROBE_SCRIPT));
        if(!execution.success)continue;
        const next=parseThemeProbe(execution.result);
        if(!next)continue;
        let score=(next.nativeCompactHeroStyled?60:0)+
          (next.nativeCompactPlayBarStyled?60:0)+
          (next.nativeCompactHeroFound?25:0)+
          (next.nativeCompactPlayBarFound?25:0)+
          (next.gameRoots>0?16:0)+(next.compactStyleActive?8:0);
        if(mainCandidates.length>1){
          try{
            const result=await bounded(executeInTab(candidate.title,false,THEME_AUDIT_READ_SCRIPT),1800);
            const audit=result.success?parseThemeAudit(result.result):null;
            const recent=(at:number)=>at>0&&Date.now()-at>=0&&Date.now()-at<=180000;
            if(recent(audit?.latestNativeCompact?.at??0))score+=30;
            else if(recent(audit?.latestCompact?.at??0))score+=15;
            else if(recent(audit?.latestGame?.at??0))score+=10;
          }catch{/* Continue with live native evidence. */}
        }
        if(score>bestScore){main=candidate;probe=next;bestScore=score;}
      }catch(error){
        empty.details="Steam CSS inspection failed: "+String(error).slice(0,140);
      }
    }
    if(!probe)return empty;
    const applied=probe.visibleUI && probe.marker===STYLE_REVISION && probe.sheets>0;
    const liveSettings=probe.settingsRoots>0 || probe.deckySettingsActive;
    const liveGame=probe.gameRoots>0;
    // Steam may remove Settings/Game Details from the main tab when QAM opens.
    // Our in-tab watcher retains the last page's CSS counts in memory, rather
    // than mistaking the resulting 0/0 live DOM for a broken CSS selector.
    let snapshot=null as ReturnType<typeof latestThemePage>;
    let audit:ReturnType<typeof parseThemeAudit>=null;
    try{
      const response=await bounded(executeInTab(main.title,false,THEME_AUDIT_READ_SCRIPT));
      if(response.success) {
        audit=parseThemeAudit(response.result);
        snapshot=latestThemePage(audit,Date.now());
      }
    }catch(error){console.warn("[game-library] last native CSS page snapshot unavailable",error);}
    const usingSnapshot=!liveSettings&&!liveGame&&snapshot!==null;
    const inspected=usingSnapshot?snapshot!.sample.probe:probe;
    const compactLastAt=audit?.latestCompact?.at??0;
    const compactMatchAge=compactLastAt?Math.round((Date.now()-compactLastAt)/1000):-1;
    const compactMatchedRecently=compactMatchAge>=0&&compactMatchAge<=180;
    const nativeLastAt=audit?.latestNativeCompact?.at??0;
    const nativeStyleAge=nativeLastAt?Math.round((Date.now()-nativeLastAt)/1000):-1;
    const nativeStyledRecently=nativeStyleAge>=0&&nativeStyleAge<=180;
    const nativeRead=nativeStyledRecently?
      audit!.latestNativeCompact!.probe:inspected;
    const onSettings=inspected.settingsRoots>0 || inspected.deckySettingsActive;
    const onGame=inspected.gameRoots>0;
    const details=!probe.visibleUI?"Selected CEF tab does not expose the Steam Game Mode DOM.":
      !applied?"Midnight CSS is not verified in this Steam document.":
      usingSnapshot
        ? snapshot!.kind==="Unclassified"
          ? "Steam CSS was sampled, but this build uses an unrecognized Settings/Game page route or classes. Use the detected background colors and CSS class examples below."
          : "Steam may hide the previous screen while QAM is open. Showing a CSS snapshot captured before QAM; compare color values and classes."

        :onSettings&&inspected.fieldRows===0
          ?"Settings was detected but its row selectors did not match."
        :onGame&&inspected.gameSections===0
          ?"Game Details was detected but its section selectors did not match."
        :!onSettings&&!onGame
          ?audit?.installed && audit.sampleTicks>0
            ?"Background watcher is running, but no matching Settings/Game screen has been recognized. Visit Settings, then reopen QAM; if still empty, inspect the route and class samples."
            :"Background watcher was not running in the Steam tab. Reapply theme, close QAM, and open Settings again."
        :"Native page selectors are present. Compare its sampled color with the Midnight palette.";
    return {
      target:main.title,discoveredTabs:tabs.length,
      detectedVisibleUI:probe.visibleUI,applied,
      themeMarker:probe.marker,cssSheets:probe.sheets,
      settingsRoots:inspected.settingsRoots,settingsFields:inspected.fieldRows,
      networkRows:inspected.networkRows,
      domEvidence:audit?.recentDomEvidence??[],
      focusTrace:audit?.focusTrace??[],
      focusAnomalies:audit?.focusAnomalies??[],
      specialSettingsRows:inspected.specialSettingsRows,
      specialSettingsRowColor:inspected.specialSettingsRowColor,
      deckySettingsActive:inspected.deckySettingsActive,
      deckyObservedDom:inspected.deckyObservedDom,
      deckyLiveCssMatched:inspected.deckyLiveCssMatched,
      deckyFieldRows:inspected.deckyFieldRows,
      deckyFieldColor:inspected.deckyFieldColor,
      gameRoots:inspected.gameRoots,
      gameSections:inspected.gameSections,
      compactEnabled:compactDetails,compactCssLoaded:inspected.compactCssLoaded,
      compactStyleActive:inspected.compactStyleActive,
      compactPosterShown:inspected.compactPosterShown,
      compactMatchedRecently,compactMatchAgeSeconds:compactMatchAge,
      libraryUIVisible:inspected.libraryUIVisible,
      nativeHeaderCount:inspected.nativeHeaderCount,
      nativePlayBarCount:inspected.nativePlayBarCount,
      nativeHeroFound:nativeRead.nativeCompactHeroFound,
      nativePlayBarFound:nativeRead.nativeCompactPlayBarFound,
      nativeHeroStyled:nativeRead.nativeCompactHeroStyled,
      nativePlayBarStyled:nativeRead.nativeCompactPlayBarStyled,
      nativeHeroHeight:nativeRead.nativeCompactHeroHeight,
      nativePlayBarHeight:nativeRead.nativeCompactPlayBarHeight,
      nativeAliasesResolved:nativeRead.nativeCompactAliasCount,
      nativeStyledRecently,nativeStyleAgeSeconds:nativeStyleAge,
      computedFieldColor:inspected.fieldColor,
      computedRootColor:inspected.rootColor,sampleClasses:inspected.sampleClasses,
      colorSamples:inspected.colorSamples,surfaceElements:inspected.surfaceElements,
      detectedRoute:inspected.routeKind,
      watcherRunning:audit?.installed===true,watcherTicks:audit?.sampleTicks??0,
      watcherAgeSeconds:audit?.lastScanAt?Math.max(0,Math.round((Date.now()-audit.lastScanAt)/1000)):0,
      captureSource:usingSnapshot?"before-qam":onSettings||onGame?"live":"none",
      capturedPage:usingSnapshot?snapshot!.kind:onSettings?"Settings":onGame?"Game Details":"",
      captureAgeSeconds:usingSnapshot?Math.max(0,Math.round((Date.now()-snapshot!.sample.at)/1000)):0,
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
  compactDetails=false;
  report({selected:"off",compactDetails:false,issue:""});
}
export function stopBuiltInThemeRuntime(){
  ++generation;
  shuttingDown=true;
  desired="off";
  compactDetails=false;
  stopTimer();
  void queue(cleanup).catch(e=>
    console.warn("[game-library] theme cleanup failed",e));
}
