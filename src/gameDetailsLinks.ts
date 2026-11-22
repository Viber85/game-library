/** URLs launched from custom Game Details.
 *
 * Steam's own native "Store Page" game action uses steam://store/<appid>
 * via NavigateToSteamWeb; a regular https URL there opens a generic web view.
 * External HLTB links should use Navigator.ExternalWeb, not SteamWeb, so
 * closing the browser doesn't step through stale native GamepadUI routes.
 */
export function steamStorePageUrl(appId:number,nonSteam:boolean):string|null{
  if(nonSteam||!Number.isSafeInteger(appId)||appId<=0||
     appId>=0x80000000)return null;
  return "steam://store/"+appId;
}

export function validHltbGameUrl(value:string):boolean{
  return /^https:\/\/howlongtobeat\.com\/game\/[0-9]+$/.test(value);
}
