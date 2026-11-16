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
};

export const STEAM_PAGE_CHECK_SCRIPT=`(() => Boolean(
  document.querySelector('.BasicUI, #GamepadUI_Full_Root, [class*="gamepadui_BasicUI"], [class*="gamepadpage_GamepadPage"]')
))()`;

export const THEME_PROBE_SCRIPT=`(() => {
  const count = (q) => {
    try { return document.querySelectorAll(q).length; } catch { return 0; }
  };
  const settings = '[class*="gamepadpagedsettings_PagedSettingsDialog_PageContent"],[class*="pagedsettings_PagedSettingsDialog_PageContent"]';
  const fields = '[class*="gamepaddialog_Field"],[class*="gamepaddialog_HighlightOnFocus"]';
  const networks = '[class*="networksettings_"],[class*="wifisettings_"],[class*="connectionsettings_"],[class*="wirelesssettings_"]';
  const games = '[class*="appdetails_Container"],[class*="appdetails_ScrollContainer"],[class*="basicappdetailssectionstyler_AppDetailsRoot"]';
  const sections = '[class*="appdetailssection_"],[class*="appdetailsnotessection_"],[class*="appdetailsmediasection_"]';
  const target = document.querySelector(settings+' '+fields) || document.querySelector(fields);
  const surface = document.querySelector('.BasicUI') || document.body;
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
    sampleClasses: Array.from(classNames)
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
};

const AUDIT_KEY = "__gameLibraryMidnightCssAudit";
const AUDIT_REVISION = "1";

export const THEME_AUDIT_INSTALL_SCRIPT = `(() => {
  const key = "${AUDIT_KEY}";
  const revision = "${AUDIT_REVISION}";
  let state = window[key];
  if (state && state.revision === revision) return true;
  if (state && state.intervalId) clearInterval(state.intervalId);
  state = { revision, intervalId: null, latestSettings: null, latestGame: null };
  window[key] = state;
  const sample = () => {
    if (window[key] !== state) return;
    try {
      const probe = JSON.parse(${THEME_PROBE_SCRIPT});
      const at = Date.now();
      if (probe.settingsRoots > 0 || probe.fieldRows > 0 && probe.networkRows > 0)
        state.latestSettings = { at, probe };
      if (probe.gameRoots > 0 || probe.gameSections > 0)
        state.latestGame = { at, probe };
    } catch (error) {
      /* Steam may be rebuilding its React tree; retry on the next tick. */
    }
  };
  sample();
  state.intervalId = setInterval(sample, 1250);
  return true;
})()`;

export const THEME_AUDIT_READ_SCRIPT = `(() => {
  const state = window["${AUDIT_KEY}"];
  return JSON.stringify({
    installed: Boolean(state && state.revision === "${AUDIT_REVISION}"),
    latestSettings: state?.latestSettings || null,
    latestGame: state?.latestGame || null
  });
})()`;

export const THEME_AUDIT_REMOVE_SCRIPT = `(() => {
  const key = "${AUDIT_KEY}";
  const state = window[key];
  if (state && state.intervalId) clearInterval(state.intervalId);
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
    latestGame:read(obj.latestGame)
  };
}

/** QAM reads the most recent actual Steam page rather than a torn-down DOM.
 * Ignore observations older than 3 minutes so the report never looks current
 * when the Steam page has changed.
 */
export function latestThemePage(audit:ThemeAudit|null,now:number):
  {kind:"Settings"|"Game Details";sample:ThemeAuditSample}|null {
  if(!audit)return null;
  const candidates: Array<{kind:"Settings"|"Game Details";sample:ThemeAuditSample}> = [];
  if(audit.latestSettings)candidates.push({kind:"Settings",sample:audit.latestSettings});
  if(audit.latestGame)candidates.push({kind:"Game Details",sample:audit.latestGame});
  candidates.sort((a,b)=>b.sample.at-a.sample.at);
  const item=candidates[0];
  if(!item||item.sample.at>now+2000||now-item.sample.at>180000)return null;
  return item;
}
