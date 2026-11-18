/**
 * SteamOS Game Mode keeps the current 24-hour preference in the live
 * FriendSettings store. Do not infer it from CEF locale; on some systems
 * Steam is configured for 24h while Chromium continues formatting 12h.
 *
 * Current client: settingsStore.m_FriendSettings.b24HourClock
 * Older clients: friendStore.m_ChatStore.m_SettingsStore.m_FriendsSettings
 * Values in Steam's VDFBoolean_t are 0/1, with boolean accepted too.
 */
type FriendClock = { b24HourClock?: unknown };
type SteamClockGlobals = {
  settingsStore?: { m_FriendSettings?: FriendClock };
  friendStore?: { m_ChatStore?: { m_SettingsStore?: {
    m_FriendsSettings?: FriendClock;
    FriendsSettings?: FriendClock;
  } } };
};

function toClockFlag(value:unknown):boolean|null {
  if(typeof value==="boolean")return value;
  if(value===1)return true;
  if(value===0)return false;
  return null;
}

/** Return null only when the Steam client has not exposed its setting. */
export function readLiveSteamClockPreference(globalObject:unknown):boolean|null {
  try {
    const steam=globalObject as SteamClockGlobals|null|undefined;
    const current=toClockFlag(steam?.settingsStore?.m_FriendSettings?.b24HourClock);
    if(current!==null)return current;
    const old=steam?.friendStore?.m_ChatStore?.m_SettingsStore;
    return toClockFlag(old?.m_FriendsSettings?.b24HourClock) ??
      toClockFlag(old?.FriendsSettings?.b24HourClock);
  } catch {
    return null;
  }
}
