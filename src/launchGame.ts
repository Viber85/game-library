/**
 * Steam's non-Steam shortcuts use a *64-bit gameID* for RunGame, not their
 * 32-bit appid. The library overview is keyed by signed appid, while
 * appStore.m_mapApps.get(appid).gameid contains the canonical gameID string.
 * The upper 32 bits of the gameID must match the shortcut appid.
 *
 * This mirrors Unifideck's getShortcutRunGameId() approach.
 */
export const STEAM_SHORTCUT_MIN_ID = 0x80000000;
export const STEAM_2FT_LIBRARY_DETAILS = 100;
const NON_STEAM_SHORTCUT_TYPE_BITS = 0x02000000n;

export type GameIDEntry = {gameid?:unknown};
export type SteamAppMap = {get?:(id:number)=>GameIDEntry|undefined};
export type SteamAppStore = {m_mapApps?:SteamAppMap}|null|undefined;

export function canonicalSteamAppId(value:number):number|null{
  if(!Number.isInteger(value)||value===0||value < -0x80000000||value>0xffffffff)return null;
  return value>>>0;
}
export function isNonSteamAppId(id:number):boolean{
  const canonical=canonicalSteamAppId(id);
  return canonical!==null&&canonical>=STEAM_SHORTCUT_MIN_ID;
}

export function shortcutRunGameId(appId:number,appStore?:SteamAppStore):string|null{
  const id=canonicalSteamAppId(appId);
  if(id===null)return null;
  if(id<STEAM_SHORTCUT_MIN_ID)return String(id);

  let stored:unknown;
  try {
    const map=appStore?.m_mapApps;
    stored=map?.get?.(id|0)?.gameid??map?.get?.(id)?.gameid;
  }catch(error){console.warn("[game-library] unable to read shortcut gameID",error);}
  if(typeof stored==="string" && /^\d{1,20}$/.test(stored)) {
    try {
      const gameId=BigInt(stored);
      if((gameId>>32n)===BigInt(id) && (gameId&0x03000000n)===NON_STEAM_SHORTCUT_TYPE_BITS)
        return stored;
      console.warn("[game-library] mismatched appStore shortcut gameID; using canonical ID");
    }catch{ /* use computed ID */ }
  }
  return ((BigInt(id)<<32n)|NON_STEAM_SHORTCUT_TYPE_BITS).toString();
}

/**
 * SteamClient.Apps.RunGame(appIdOrGameId, options, launchOptionIndex, source).
 * For store games, use normal AppID. For shortcuts, Steam needs their
 * 64-bit gameID, formatted as a *decimal string* (not a JS number).
 */
export function steamRunGameArgs(
  appId:number,
  appStore?:SteamAppStore,
):[string,string,number,number]|null {
  const id=shortcutRunGameId(appId,appStore);
  return id===null?null:[id,"",-1,STEAM_2FT_LIBRARY_DETAILS];
}

/** Sending a RunGame request does not confirm the process launched. */
export function requestSteamLaunch(
  steamClient: {Apps?:{RunGame?:(...args:[string,string,number,number])=>void}}|null|undefined,
  appId:number,
  appStore?:SteamAppStore,
):boolean{
  const args=steamRunGameArgs(appId,appStore);
  if(!args||typeof steamClient?.Apps?.RunGame!=="function")return false;
  steamClient.Apps.RunGame(...args);
  return true;
}
