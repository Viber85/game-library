/**
 * Steam uses a signed int32 representation of some non-Steam shortcut IDs,
 * but Apps.RunGame expects their canonical, unsigned decimal AppID string.
 */
export const STEAM_SHORTCUT_MIN_ID = 0x80000000;
export const STEAM_2FT_LIBRARY_DETAILS = 100;

/**
 * Return a safe unsigned 32-bit Steam app ID. A Steam shortcut can arrive as
 * -2147483648 in an int32 value even though its real ID is 2147483648.
 * Reject noninteger/out-of-32-bit values rather than wrapping arbitrary IDs.
 */
export function canonicalSteamAppId(value: number): number | null {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0xffffffff || value===0) return null;
  return value >>> 0;
}

export function isNonSteamAppId(id: number): boolean {
  const canonical=canonicalSteamAppId(id);
  return canonical!==null && canonical>=STEAM_SHORTCUT_MIN_ID;
}

/**
 * SteamClient.Apps.RunGame(appId, launchOptions, launchOptionIndex, source)
 *
 * -1 selects the application's default launch option; zero forces option
 * index 0, which does not reliably launch some native Linux shortcuts.
 * 100 is ELaunchSource._2ftLibraryDetails from Steam's typed SDK.
 * The source is NOT a "shortcut type": use the same library source for both.
 */
export function steamRunGameArgs(appId:number):[string,string,number,number]|null {
  const valid=canonicalSteamAppId(appId);
  return valid===null?null:[String(valid),"",-1,STEAM_2FT_LIBRARY_DETAILS];
}

/** Request a native Steam launch. Returns false only if no request could be issued.
 * Steam's void RunGame API does not report success or failure of the process.
 */
export function requestSteamLaunch(
  steamClient: { Apps?: { RunGame?: (...args: [string,string,number,number])=>void } } | null | undefined,
  appId: number,
): boolean {
  const args=steamRunGameArgs(appId);
  if (!args || typeof steamClient?.Apps?.RunGame!=="function") return false;
  steamClient.Apps.RunGame(...args);
  return true;
}
