export type ThemeScope = "main" | "overlay";
export type BrowserTab = {title?:unknown;url?:unknown};

export function classifySteamTab(item:BrowserTab): {title:string;scope:ThemeScope}|null {
  if(typeof item.title!=="string")return null;
  const title=item.title.trim();
  const url=typeof item.url==="string"?item.url:"";
  if(!title||title.length>180)return null;
  if(title==="Steam Big Picture Mode" ||
     url.includes("Valve%20Steam%20Gamepad") ||
     url.includes("Valve Steam Gamepad/default"))
    return {title,scope:"main"};
  if(title.startsWith("QuickAccess")||title.startsWith("MainMenu"))
    return {title,scope:"overlay"};
  return null;
}

export function identifySteamTabs(value:unknown): Array<{title:string;scope:ThemeScope}> {
  if(!Array.isArray(value))return [];
  const tabs=new Map<string,ThemeScope>();
  for(const raw of value){
    if(!raw||typeof raw!=="object")continue;
    const matched=classifySteamTab(raw as BrowserTab);
    if(matched)tabs.set(matched.title,matched.scope);
  }
  return [...tabs].map(([title,scope])=>({title,scope}));
}
