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
