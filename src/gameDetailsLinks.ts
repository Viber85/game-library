/** URLs launched from the custom Game Details screen.
 *
 * Trial v0.6.11-test.32: open both HowLongToBeat and Steam Store through
 * ExternalWeb (HTTPS) to isolate SteamWeb + steam://store history behavior.
 * This is deliberately an external web view, not Steam's native Store.
 * Authentication and Store client actions are not guaranteed.
 */
export function steamStorePageUrl(appId:number,nonSteam:boolean):string|null{
  if(nonSteam||!Number.isSafeInteger(appId)||appId<=0||
     appId>=0x80000000)return null;
  return "https://store.steampowered.com/app/"+appId;
}

export function validHltbGameUrl(value:string):boolean{
  return /^https:\/\/howlongtobeat\.com\/game\/[0-9]+$/.test(value);
}
