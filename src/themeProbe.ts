/** Read-only CEF document inspection. The string is executed inside Steam's
 * actual browser tab by Decky's executeInTab API, NOT inside the Decky plugin
 * React iframe. It reads only CSS classes and computed colors, never text,
 * network names, usernames, library content or input values.
 */
export type ThemeProbe={
  visibleUI:boolean;
  marker:string;
  sheets:number;
  settingsRoots:number;
  fieldRows:number;
  networkRows:number;
  gameRoots:number;
  gameSections:number;
  fieldColor:string;
  rootColor:string;
  sampleClasses:string[];
  routeKind:"settings"|"game"|"other";
  surfaceElements:number;
  colorSamples:Array<{color:string;count:number;className:string}>;
};

export const STEAM_PAGE_CHECK_SCRIPT=`(() => Boolean(
  document.querySelector('.BasicUI, #GamepadUI_Full_Root, [class*="gamepadui_BasicUI"], [class*="gamepadpage_GamepadPage"]')
))()`;

export const THEME_PROBE_SCRIPT=`(() => {
  const count = (q) => {
    try { return document.querySelectorAll(q).length; } catch { return 0; }
  };
  const settings = '[class*="gamepadpagedsettings_PagedSettingsDialog_PageContent"],[class*="pagedsettings_PagedSettingsDialog_PageContent"],[data-glm-settings-root]';
  const fields = '[class*="gamepaddialog_Field"],[class*="gamepaddialog_HighlightOnFocus"],[data-glm-settings-row]';
  const networks = '[class*="networksettings_"],[class*="wifisettings_"],[class*="connectionsettings_"],[class*="wirelesssettings_"]';
  const games = '[class*="appdetails_Container"],[class*="appdetails_ScrollContainer"],[class*="basicappdetailssectionstyler_AppDetailsRoot"]';
  const sections = '[class*="appdetailssection_"],[class*="appdetailsnotessection_"],[class*="appdetailsmediasection_"]';
  // First locate the actual native Settings root, then inspect a row inside
  // it. Concatenating two comma-separated selectors would incorrectly match
  // the Settings root itself rather than a Field child.
  const settingsRoot = document.querySelector(settings);
  const target = settingsRoot ? settingsRoot.querySelector(fields) : null;
  const surface = document.querySelector('.BasicUI') || document.body;
  // Steam can minify all Settings class names. The route is an independent
  // signal; only its coarse category is returned, never the actual URL/AppID.
  const route = String(window.location?.pathname||'')+' '+String(window.location?.hash||'');
  const routeKind = (count('[data-glm-settings-root]')>0 || /(?:^|[\\s\\/#])settings(?:[\\s\\/#?]|$)/i.test(route)) ? 'settings'
    : /(?:library\\/app\\/|library\\/game\\/|game\\/details\\/)/i.test(route) ? 'game' : 'other';
  // Bounded scan of live CSS backgrounds on the page; no text, URLs, values,
  // app names or image data are accessed. Useful if CSS modules are hashed.
  const surfaces = new Map();
  let surfaceElements = 0;
  if(count('.BasicUI,#GamepadUI_Full_Root,[class*="gamepadui_BasicUI"]')>0){
    const all = surface?.querySelectorAll?.('[class]') || [];
    const limit = Math.min(all.length, 280);
    for(let n=0;n<limit;n++){
      const element=all[n];
      if(!element || !/^(?:DIV|BUTTON|SECTION|LI|A)$/i.test(element.tagName||''))continue;
      const token=typeof element.className==='string' ? element.className.split(/\\s+/)
        .find(x=>/^[A-Za-z0-9_-]{3,100}$/.test(x) && x!=='gpfocus') : null;
      if(!token)continue;
      const color=getComputedStyle(element).backgroundColor;
      if(typeof color!=='string' || !/^rgba?\\(/.test(color))continue;
      const components=color.match(/[\\d.]+/g)?.map(Number)||[];
      if(components.length<3 || (components.length>3&&components[3]<.65))continue;
      const [r,g,b]=components;
      if(!(b>=55 && b>r*1.12 && b>=g*.83))continue;
      surfaceElements++;
      const item=surfaces.get(color)||{color,count:0,className:token};
      item.count++;
      surfaces.set(color,item);
    }
  }
  const colorSamples=[...surfaces.values()]
    .sort((a,b)=>b.count-a.count).slice(0,4);
  const classNames = new Set();
  if (count(settings) || count(games)) {
    const root = document.querySelector(settings) || document.querySelector(games);
    if (root) {
      const nodes = [root,...Array.from(root.querySelectorAll('*')).slice(0,70)];
      for (const el of nodes) {
        if(typeof el.className !== 'string') continue;
        for (const token of el.className.split(/\\s+/)) {
          if (/^(?:gamepadpagedsettings|gamepaddialog|networksettings|wifisettings|appdetails)[_A-Za-z0-9-]{2,}$/.test(token))
            classNames.add(token.slice(0,90));
          if(classNames.size>=8) break;
        }
        if(classNames.size>=8) break;
      }
    }
  }
  return JSON.stringify({
    visibleUI: Boolean(document.querySelector('.BasicUI, #GamepadUI_Full_Root, [class*="gamepadui_BasicUI"], [class*="gamepadpage_GamepadPage"]')),
    marker: getComputedStyle(document.documentElement).getPropertyValue('--game-library-midnight-active').trim(),
    sheets: Array.from(document.querySelectorAll('style')).filter(el=>
      el.textContent?.includes('--game-library-midnight-active:')).length,
    settingsRoots: count(settings),
    fieldRows: count(fields),
    networkRows: count(networks),
    gameRoots: count(games),
    gameSections: count(sections),
    fieldColor: target ? getComputedStyle(target).backgroundColor : '',
    rootColor: getComputedStyle(surface).backgroundColor,
    sampleClasses: Array.from(classNames),
    routeKind,
    surfaceElements,
    colorSamples
  });
})()`;

export function parseThemeProbe(input:unknown):ThemeProbe|null{
  let x:unknown=input;
  try { if(typeof x==="string") x=JSON.parse(x); }
  catch{return null;}
  if(!x||typeof x!=="object")return null;
  const obj=x as Record<string,unknown>;
  const integer=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>=0?Number(value):0;
  return {
    visibleUI:obj.visibleUI===true,
    marker:typeof obj.marker==="string"?obj.marker.slice(0,20):"",
    sheets:integer(obj.sheets),
    settingsRoots:integer(obj.settingsRoots),
    fieldRows:integer(obj.fieldRows),
    networkRows:integer(obj.networkRows),
    gameRoots:integer(obj.gameRoots),
    gameSections:integer(obj.gameSections),
    fieldColor:typeof obj.fieldColor==="string"?obj.fieldColor.slice(0,60):"",
    rootColor:typeof obj.rootColor==="string"?obj.rootColor.slice(0,60):"",
    routeKind:obj.routeKind==="settings"?"settings":obj.routeKind==="game"?"game":"other",
    surfaceElements:integer(obj.surfaceElements),
    colorSamples:Array.isArray(obj.colorSamples)?
      obj.colorSamples.slice(0,4).flatMap(entry=>{
        if(!entry||typeof entry!=="object")return [];
        const sample=entry as Record<string,unknown>;
        if(typeof sample.color!=="string"|| !/^rgba?[(][0-9., ]+[)]$/.test(sample.color) ||
           typeof sample.className!=="string" || !/^[A-Za-z0-9_-]{3,100}$/.test(sample.className))return [];
        return [{color:sample.color.slice(0,55),count:integer(sample.count),
          className:sample.className.slice(0,100)}];
      }):[],
    sampleClasses:Array.isArray(obj.sampleClasses)
      ? obj.sampleClasses.filter((v):v is string=>typeof v==="string")
        .slice(0,8).map(v=>v.slice(0,90))
      : [],
  };
}


/**
 * When QAM opens, Steam may unmount Settings or native game details from the
 * main Game Mode DOM. A one-time diagnostic run from Decky then reports 0/0
 * even if a themed page was displayed a moment before.
 *
 * Keep only last CSS-class/count/color snapshots in the *Steam CEF document*
 * (not localStorage, not persistent plugin settings). Sampling starts with
 * the active Midnight theme and stops as soon as the plugin/theme unloads.
 * No network names, game titles, text nodes or input values are read.
 */
export type ThemeAuditSample={at:number;probe:ThemeProbe};
export type ThemeAudit={
  installed:boolean;
  latestSettings:ThemeAuditSample|null;
  latestGame:ThemeAuditSample|null;
  latestOther:ThemeAuditSample|null;
  sampleTicks:number;
  lastScanAt:number;
};

const AUDIT_KEY = "__gameLibraryMidnightCssAudit";
const AUDIT_REVISION = "10";

/**
 * Some SteamOS clients hash every CSS-module class. Identify only a
 * Settings-like TWO COLUMN layout: a tall stack of short left-side nav
 * entries and at least four long blue-gray rows in the right pane.
 * No displayed text, network names, URLs or values are read.
 * All markers are removed on each scan, so other pages revert normally.
 */
export const STEAM_SETTINGS_MARK_SCRIPT = `(() => {
  // Visual-only recognition; never inspect page text, credentials, network
  // names, URLs, values, images or game data.
  const attrs = ['data-glm-settings-root','data-glm-settings-row',
    'data-glm-settings-navitem','data-glm-settings-row-part',
    'data-glm-settings-sidebar','data-glm-settings-main',
    'data-glm-settings-surface'];
  try {
    // Retain markers on stable Settings DOM nodes. Removing every marker and
    // then re-adding it briefly reveals Valve's native gradient on navigation.
    const previous=Array.from(document.querySelectorAll(attrs.map(a=>'['+a+']').join(',')));
    const keep=new Map();
    const mark=(node,attr)=>{
      if(!node)return;
      let marks=keep.get(node);
      if(!marks){marks=new Set();keep.set(node,marks);}
      marks.add(attr);
      if(!node.hasAttribute?.(attr))node.setAttribute?.(attr,'');
    };
    const prune=()=>{
      for(const node of previous){
        const marks=keep.get(node);
        for(const attr of attrs)
          if(!marks?.has(attr) && node.hasAttribute?.(attr))
            node.removeAttribute?.(attr);
      }
    };
    const oldRows=new Set(document.querySelectorAll('[data-glm-settings-row]'));
    const oldParts=new Set(document.querySelectorAll('[data-glm-settings-row-part]'));
    const root=document.querySelector('.BasicUI') ||
      document.querySelector('#GamepadUI_Full_Root');
    if(!root){prune();return false;}
    const semantic=Boolean(document.querySelector(
      '[class*="gamepadpagedsettings_PagedSettingsDialog_PageContent"]'));
    const width=window.innerWidth||document.documentElement?.clientWidth||0;
    const height=window.innerHeight||document.documentElement?.clientHeight||0;
    if(width<500||height<270){prune();return false;}
    const left=[],right=[];
    const positions=new Map();
    const isRow=(el,kind)=>{
      if(!el || !/^(?:DIV|BUTTON|LI|SECTION)$/i.test(el.tagName||'') ||
          typeof el.getBoundingClientRect!=='function')return false;
      const b=el.getBoundingClientRect();
      if(b.top<height*.035 || b.bottom>height*.98)return false;
      if(kind==='left'){
        if(b.height<20||b.height>78||b.left<0||b.left>width*.23||
           b.width<width*.10||b.width>width*.36||b.right>width*.44)return false;
      }else{
        if(b.height<24||b.height>104||b.left<width*.22||
           b.width<width*.40||b.width>width*.85||b.right>width*1.07)return false;
      }
      positions.set(el,b);
      return true;
    };
    const pushStack=(stack,kind)=>{
      for(const el of stack){
        if(!isRow(el,kind))continue;
        const arr=kind==='left'?left:right;
        arr.push(el);
      }
    };
    // Element sampling hits rendered rows, even if Valve has thousands of
    // off-screen nodes or paints a row via pseudo elements/gradients.
    if(typeof document.elementsFromPoint==='function'){
      for(let y=Math.round(height*.075);y<height*.94;y+=15){
        pushStack(document.elementsFromPoint(width*.14,y).slice(0,16),'left');
        pushStack(document.elementsFromPoint(width*.56,y).slice(0,18),'right');
      }
    }
    // Browser builds without elementsFromPoint or with a nested Steam pane.
    // The result is still confirmed by a two-column Settings layout.
    if(typeof document.elementsFromPoint!=='function'){
      const all=root.querySelectorAll?.('[class]')||[];
      const limit=Math.min(all.length,6500);
      for(let i=0;i<limit;i++){
        const el=all[i];
        if(isRow(el,'left'))left.push(el);
        else if(isRow(el,'right'))right.push(el);
      }
    }
    const groupRows=(nodes)=>{
      const groups=new Map();
      for(const el of nodes){
        const rect=positions.get(el);
        if(!rect)continue;
        const key=Math.round(rect.top/11);
        const existing=groups.get(key);
        // The outer full-width field is preferable to a nested label.
        if(!existing||positions.get(existing).width<rect.width)groups.set(key,el);
      }
      return Array.from(groups.values()).sort((a,b)=>positions.get(a).top-positions.get(b).top);
    };
    const nav=groupRows(left),rows=groupRows(right);
    // Distinct settings categories on the left + broad field strips on the
    // right. Unlike screen-copy matching, this is language independent.
    // Family and similar categories can show only one control, or none.
    // A full Steam Settings rail has 9+ distinct navigation rows, whereas
    // Home, QAM and game details do not. This does not read page labels.
    const match=Boolean(semantic || (nav.length>=9 && (rows.length>=1 || nav.length>=10)));
    if(!match){prune();return false;}
    mark(root,'data-glm-settings-root');
    // Document root only activates Settings-scoped CSS; it is cleared as
    // soon as the recognizable Settings rail disappears.
    mark(document.documentElement,'data-glm-settings-root');
    const findPane=(element,minWidth,maxWidth)=>{
      // Prefer the outermost Settings pane, not the first inner scroll list.
      // Storage's games list is nested and its disk/header background sits
      // outside that list; styling only the inner list leaves a blue haze.
      let pane=null;
      for(let parent=element?.parentElement;parent&&parent!==root;
          parent=parent.parentElement){
        const b=parent.getBoundingClientRect?.();
        if(b&&b.width>=width*minWidth&&b.width<=width*maxWidth&&
          b.height>=height*.48&&b.height<=height*1.1)pane=parent;
      }
      return pane;
    };
    const navPane=findPane(nav[0],.10,.40);
    let mainPane=findPane(rows[0],.42,.91);
    if(!mainPane && typeof document.elementsFromPoint==='function'){
      // Sparse pages such as Family have no full-width Settings fields.
      // Find the right pane by layout geometry, without looking at text.
      for(const y of [height*.34,height*.53]){
        const stack=document.elementsFromPoint(width*.61,y)||[];
        for(const el of stack){
          if(!el?.getBoundingClientRect || !/^(DIV|SECTION|MAIN)$/i.test(el.tagName||''))continue;
          const b=el.getBoundingClientRect();
          if(b.left>=width*.20 && b.width>=width*.45 && b.width<=width*.94 &&
             b.height>=height*.46 && b.height<=height*1.10){
            mainPane=el;break;
          }
        }
        if(mainPane)break;
      }
    }
    mark(navPane,'data-glm-settings-sidebar');
    mark(mainPane,'data-glm-settings-main');
    if(mainPane?.querySelectorAll){
      // Flatten only large structural surfaces: NOT toggles, sliders,
      // dropdowns, game artwork, small buttons or individual icons.
      const shells=mainPane.querySelectorAll('[class]');
      const limit=Math.min(shells.length,1100);
      for(let n=0;n<limit;n++){
        const el=shells[n];
        if(!/^(DIV|SECTION|MAIN)$/i.test(el.tagName||'')||!el.getBoundingClientRect)continue;
        const b=el.getBoundingClientRect();
        if(b.left>=width*.20 && b.width>=width*.43 && b.width<=width*.94 &&
           b.height>=height*.23 && b.height<=height*1.12)
          mark(el,'data-glm-settings-surface');
      }
    }

    // Elements already present below the fold must receive Midnight styling
    // BEFORE the user scrolls to them. Bounding boxes still have reliable
    // width, x-position and height when their y-position is off-screen.
    // Restrict this scan to the confirmed Settings content pane; do not
    // traverse the whole Steam DOM or touch artwork, icons or form inputs.
    // Sparse Settings pages can contain one full-width action button.
    // Do not mistake that button for a field strip and overwrite its color.
    const allRows=rows.length>=2?[...rows]:[];
    if(mainPane?.querySelectorAll && rows.length>=2){
      const nominalWidth=positions.get(rows[Math.floor(rows.length/2)])?.width||width*.6;
      const candidates=mainPane.querySelectorAll('[class]');
      const limit=Math.min(candidates.length,2400);
      const seen=new Set(rows);
      for(let n=0;n<limit;n++){
        const el=candidates[n];
        if(seen.has(el) || !/^(?:DIV|BUTTON|LI|SECTION)$/i.test(el.tagName||'') ||
           !el.getBoundingClientRect)continue;
        const b=el.getBoundingClientRect();
        if(b.height<24 || b.height>104 || b.left<width*.22 ||
           b.width<width*.4 || b.width>width*.85 ||
           b.width<nominalWidth*.76 || b.width>nominalWidth*1.18)continue;
        seen.add(el);
        positions.set(el,b);
        allRows.push(el);
      }
    }
    const blueGray=(el)=>{
      const style=getComputedStyle(el);
      if(style.backgroundImage && style.backgroundImage!=='none')return true;
      const rgba=String(style.backgroundColor||'').match(/[0-9.]+/g)?.map(Number)||[];
      if(rgba.length>=4&&rgba[3]<.35)return false;
      return rgba.length>=3 && rgba[2]>=rgba[0]+8 &&
        rgba[2]>=rgba[1]*.83 && rgba[2]>=70 &&
        !(rgba[1]>150&&rgba[2]>165);
    };
    const isInteractive=(el)=>{
      if(/^(?:BUTTON|INPUT|SELECT|TEXTAREA|SVG|LABEL)$/i.test(el.tagName||''))return true;
      const role=el.getAttribute?.('role')||'';
      if(/^(?:button|slider|switch|combobox|textbox|checkbox|radio|progressbar)$/i.test(role))return true;
      const cls=typeof el.className==='string'?el.className:'';
      return /(?:gamepaddropdown_|gamepadslider_|gamepaddialog_Toggle|gamepaddialog_Button|gamepadcheckbox_|gamepadradio_)/i.test(cls);
    };
    for(const row of allRows){
      if(isInteractive(row))continue;
      mark(row,'data-glm-settings-row');
      const b=positions.get(row);
      if(!b)continue;
      // A Steam row may paint a 100%-width child or GRANDCHILD. The old
      // probe excluded children wider than 98% of the row, leaving exactly
      // the blue strips the user sees despite a transparent outer row.
      // Walk a small, bounded subtree and mark only broad background
      // wrappers, never buttons, controls, slider tracks or icon glyphs.
      const queue=Array.from(row.children||[]).slice(0,24).map(el=>({el,depth:1}));
      let checked=0;
      while(queue.length && checked++<96){
        const {el,depth}=queue.shift();
        if(!el || isInteractive(el) || !/^(?:DIV|SECTION|LI)$/i.test(el.tagName||'') ||
           typeof el.getBoundingClientRect!=='function')continue;
        const c=el.getBoundingClientRect();
        const fullRowSurface=c.width>=b.width*.52 && c.width<=b.width*1.08 &&
          c.height>=b.height*.50 && c.height<=b.height*1.16 &&
          c.left>=b.left-10 && c.right<=b.right+10;
        if(fullRowSurface && (blueGray(el)||oldParts.has(el)||depth<=2))
          mark(el,'data-glm-settings-row-part');
        if(depth<3)
          for(const child of Array.from(el.children||[]).slice(0,24))
            queue.push({el:child,depth:depth+1});
      }
    }
    for(const item of nav)mark(item,'data-glm-settings-navitem');
    prune();
    return Boolean(mainPane || rows.length>0 || nav.length>=9);
  }catch{return false;}
})()`;

export const THEME_AUDIT_INSTALL_SCRIPT = `(() => {
  const key = "${AUDIT_KEY}";
  const revision = "${AUDIT_REVISION}";
  let state = window[key];
  if (state && state.revision === revision) return true;
  if (state) {
    state.observer?.disconnect?.();
    if (state.onScroll) document.removeEventListener?.('scroll',state.onScroll,true);
    if (state.frameId != null && typeof cancelAnimationFrame === 'function')
      cancelAnimationFrame(state.frameId);
    if (state.intervalId != null) clearInterval(state.intervalId);
  }
  state = { revision, intervalId: null, observer: null, frameId: null,
    onScroll:null, latestSettings: null, latestGame: null, latestOther: null,
    sampleTicks:0, lastScanAt:0 };
  window[key] = state;
  const sample = () => {
    if (window[key] !== state) return;
    try {
      // Mark unrecognized Steam Settings surfaces before the QAM unmounts them.
      ${STEAM_SETTINGS_MARK_SCRIPT};
      const probe = JSON.parse(${THEME_PROBE_SCRIPT});
      const at = Date.now();
      state.sampleTicks++;
      state.lastScanAt=at;
      if (probe.routeKind === 'other' && probe.surfaceElements >= 4)
        state.latestOther = {at,probe};
      if (probe.settingsRoots > 0 || probe.fieldRows > 0 && probe.networkRows > 0 ||
          probe.routeKind === 'settings' && probe.surfaceElements >= 3)
        state.latestSettings = { at, probe };
      if (probe.gameRoots > 0 || probe.gameSections > 0 ||
          probe.routeKind === 'game' && probe.surfaceElements >= 3)
        state.latestGame = { at, probe };
    } catch (error) {
      /* Steam may be rebuilding its React tree; retry on the next tick. */
    }
  };
  // Steam builds its Settings DOM in stages. Observe structural additions
  // and coalesce them into one scan on the next frame instead of waiting
  // for the 1.8-second polling interval. Only childList is observed:
  // our own data-glm-* marker attribute changes NEVER trigger this watcher.
  const scheduleScan=()=>{
    if(window[key]!==state || state.frameId!=null)return;
    if(typeof requestAnimationFrame!=='function') {
      sample();
      return;
    }
    state.frameId=requestAnimationFrame(()=>{
      state.frameId=null;
      if(window[key]===state)sample();
    });
  };
  sample();
  let observing=false;
  if(typeof MutationObserver==='function' && document.documentElement) {
    try {
      // MutationObserver callbacks run at the microtask checkpoint, normally
      // BEFORE the browser paints Steam's newly inserted Settings content.
      // Apply palette markers immediately, then re-check on the next frame
      // only for layouts Steam finishes asynchronously.
      let lastFastScan=0;
      state.observer=new MutationObserver(()=>{
        if(window[key]!==state)return;
        const now=Date.now();
        if(now-lastFastScan>=32){
          lastFastScan=now;
          sample();
        }
        scheduleScan();
      });
      state.observer.observe(document.documentElement,{
        childList:true,subtree:true
      });
      observing=true;
    }catch{
      state.observer?.disconnect?.();
      state.observer=null;
    }
  }
  // Scroll can expose pre-existing offscreen nodes without inserting any
  // DOM children. Capture-phase scroll also reaches nested Steam list panes.
  // All events share the same one-scan-per-frame scheduler.
  let lastScrollAt=0;
  state.onScroll=()=>{
    // Avoid doing a full Settings geometry scan for every wheel/touch tick.
    if(document.documentElement?.hasAttribute?.('data-glm-settings-root')===false)return;
    const now=Date.now();
    if(now-lastScrollAt<100)return;
    lastScrollAt=now;
    scheduleScan();
  };
  document.addEventListener?.('scroll',state.onScroll,true);
  // Slow fallback for Steam route changes that don't insert DOM nodes,
  // and for clients without MutationObserver support.
  state.intervalId=setInterval(sample,observing?5000:1800);
  return true;
})()`;

export const THEME_AUDIT_READ_SCRIPT = `(() => {
  const state = window["${AUDIT_KEY}"];
  return JSON.stringify({
    installed: Boolean(state && state.revision === "${AUDIT_REVISION}"),
    latestSettings: state?.latestSettings || null,
    latestGame: state?.latestGame || null,
    latestOther: state?.latestOther || null,
    sampleTicks: state?.sampleTicks || 0,
    lastScanAt: state?.lastScanAt || 0
  });
})()`;

export const THEME_AUDIT_REMOVE_SCRIPT = `(() => {
  const key = "${AUDIT_KEY}";
  const state = window[key];
  if (state) {
    state.observer?.disconnect?.();
    if(state.onScroll)document.removeEventListener?.('scroll',state.onScroll,true);
    if(state.frameId!=null && typeof cancelAnimationFrame==='function')
      cancelAnimationFrame(state.frameId);
    if(state.intervalId!=null)clearInterval(state.intervalId);
  }
  // Remove temporary visual markers as soon as Midnight is disabled.
  const attrs=['data-glm-settings-root','data-glm-settings-row',
    'data-glm-settings-navitem','data-glm-settings-row-part',
    'data-glm-settings-sidebar','data-glm-settings-main',
    'data-glm-settings-surface'];
  for(const node of document.querySelectorAll(attrs.map(a=>'['+a+']').join(',')))
    for(const attr of attrs)node.removeAttribute?.(attr);
  delete window[key];
  return true;
})()`;

export function parseThemeAudit(value:unknown):ThemeAudit|null {
  let item:unknown = value;
  try { if(typeof item==="string")item=JSON.parse(item); }
  catch { return null; }
  if(!item||typeof item!=="object")return null;
  const obj=item as Record<string,unknown>;
  const read=(source:unknown):ThemeAuditSample|null=>{
    if(!source||typeof source!=="object")return null;
    const v=source as Record<string,unknown>;
    if(typeof v.at!=="number"||!Number.isFinite(v.at)||v.at<=0)return null;
    const probe=parseThemeProbe(v.probe);
    if(!probe)return null;
    return {at:v.at,probe};
  };
  return {
    installed:obj.installed===true,
    latestSettings:read(obj.latestSettings),
    latestGame:read(obj.latestGame),
    latestOther:read(obj.latestOther),
    sampleTicks: Number.isSafeInteger(obj.sampleTicks) ? Math.max(0,Number(obj.sampleTicks)) : 0,
    lastScanAt: typeof obj.lastScanAt==="number" && Number.isFinite(obj.lastScanAt) ? obj.lastScanAt : 0
  };
}

/** QAM reads the most recent actual Steam page rather than a torn-down DOM.
 * Ignore observations older than 3 minutes so the report never looks current
 * when the Steam page has changed.
 */
export function latestThemePage(audit:ThemeAudit|null,now:number):
  {kind:"Settings"|"Game Details"|"Unclassified";sample:ThemeAuditSample}|null {
  if(!audit)return null;
  const candidates: Array<{kind:"Settings"|"Game Details"|"Unclassified";sample:ThemeAuditSample}> = [];
  if(audit.latestSettings)candidates.push({kind:"Settings",sample:audit.latestSettings});
  if(audit.latestGame)candidates.push({kind:"Game Details",sample:audit.latestGame});
  // Unknown-route snapshots must not supersede recently detected Settings
  // or Game Details. They are a fallback to learn actual minified CSS classes.
  if(!candidates.some(x=>now-x.sample.at<180000) && audit.latestOther)
    candidates.push({kind:"Unclassified",sample:audit.latestOther});
  candidates.sort((a,b)=>b.sample.at-a.sample.at);
  const item=candidates[0];
  if(!item||item.sample.at>now+2000||now-item.sample.at>180000)return null;
  return item;
}
