export type ThemeScope = "main" | "overlay";
export type BrowserTab = {title?:unknown;url?:unknown};
export type SteamTab = {title:string;scope:ThemeScope};

const BIG_PICTURE_TITLES=new Set([
  "Steam Big Picture Mode",
  "Steam 大屏幕模式",
  "Steam 大畫面模式",
]);
const STEAM_SHARED_TITLES=new Set([
  "SP","Steam","SharedJSContext","Steam Shared Context presented by Valve™",
]);
export const FALLBACK_MAIN_TITLES=[
  "Steam Big Picture Mode","Steam 大屏幕模式","Steam","SP","SharedJSContext",
] as const;

function looksLikeGamepadUrl(url:string):boolean{
  return /Valve(?:%20| )Steam(?:%20| )Gamepad/i.test(url) ||
    url.includes("steamloopback.host/routes/") ||
    url.includes("steamloopback.host/index.html");
}
export function classifySteamTab(item:BrowserTab): SteamTab|null {
  if(typeof item.title!=="string")return null;
  const title=item.title.trim();
  const url=typeof item.url==="string"?item.url:"";
  if(!title||title.length>180)return null;
  if(BIG_PICTURE_TITLES.has(title))return {title,scope:"main"};
  if(STEAM_SHARED_TITLES.has(title)&&looksLikeGamepadUrl(url))
    return {title,scope:"main"};
  if(title.startsWith("QuickAccess")||title.startsWith("MainMenu"))
    return {title,scope:"overlay"};
  return null;
}

export function identifySteamTabs(value:unknown):SteamTab[]{
  if(!Array.isArray(value))return [];
  const tabs=new Map<string,ThemeScope>();
  for(const raw of value){
    if(!raw||typeof raw!=="object")continue;
    const matched=classifySteamTab(raw as BrowserTab);
    if(matched)tabs.set(matched.title,matched.scope);
  }
  // The *visible* Big Picture tab takes precedence over SharedJSContext,
  // which can be an off-screen auxiliary browser with an unrelated DOM.
  const weight=(tab:SteamTab)=>BIG_PICTURE_TITLES.has(tab.title)?0:
    tab.scope==="main"?1:2;
  return [...tabs].map(([title,scope])=>({title,scope}))
    .sort((a,b)=>weight(a)-weight(b));
}
