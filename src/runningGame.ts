import { canonicalSteamAppId } from "./launchGame.ts";

/**
 * Active Steam Game Mode session, not a launch target. Steam tracks both store
 * apps and non-Steam shortcuts here under their 32-bit appid (which can arrive
 * as a signed integer for shortcuts).
 */
export interface RunningGame {
  id:number;
  title:string;
}
type SteamAppRecord=Record<string,unknown>;
export interface RunningSteamStore {
  RunningApps?:unknown;
  MainRunningAppID?:unknown;
  SetRunningApp?:(appid:number)=>void;
  NavigateToRunningApp?:(replaceHistoryEntry?:boolean)=>void;
}
type OverviewStore={
  GetAppOverviewByAppID?:(appid:number)=>unknown;
  m_mapApps?:{get?:(appid:number)=>unknown};
};

function record(value:unknown):SteamAppRecord|null {
  return typeof value==="object"&&value!==null ? value as SteamAppRecord : null;
}
function appid(value:unknown):number|null {
  const n=typeof value==="number" ? value :
    typeof value==="string" && /^-?\d{1,10}$/.test(value)?Number(value):NaN;
  return canonicalSteamAppId(n);
}
function list(value:unknown):unknown[] {
  try {
    if(Array.isArray(value))return [...value];
    if(value && typeof (value as Iterable<unknown>)[Symbol.iterator]==="function")
      return Array.from(value as Iterable<unknown>);
  }catch {/* Steam may detach an observable while a game exits. */}
  return [];
}
function name(value:unknown):string {
  const obj=record(value);
  const candidate=obj?.display_name ?? obj?.strDisplayName ?? obj?.name;
  return typeof candidate==="string" ? candidate.trim() : "";
}
function fallbackName(id:number,store:OverviewStore|null|undefined):string {
  if(!store)return "";
  try {
    const overview=store.GetAppOverviewByAppID?.(id) ??
      store.GetAppOverviewByAppID?.(id|0);
    const found=name(overview);
    if(found)return found;
  }catch{/* an overview can be unloaded while switching Steam pages */}
  try {
    const map=store.m_mapApps;
    return name(map?.get?.(id) ?? map?.get?.(id|0));
  }catch{return "";}
}
function actuallyRunning(value:unknown):boolean {
  const rec=record(value);
  if(!rec)return false;
  const local=record(rec.local_per_client_data);
  const status=local?.display_status;
  // Steam EDisplayStatus Running=4, Launching=1, Terminating=36.
  // A listed overview without a status is usable as a best-effort fallback,
  // but never show items explicitly starting, terminating or stopped.
  return status===undefined||status===null||status===4;
}

/** Only SteamUIStore.RunningApps is authoritative. MainRunningAppID selects
 * which listed game is active, but must not create a phantom running item. */
export function readRunningGame(
  steam:RunningSteamStore|null|undefined,
  appStore:OverviewStore|null|undefined,
):RunningGame|null {
  if(!steam)return null;
  let apps:unknown[];
  let preferred:number|null=null;
  try {
    apps=list(steam.RunningApps);
    preferred=appid(steam.MainRunningAppID);
  }catch{return null;}
  const candidates=apps.map(entry=>({
    entry,id:appid(record(entry)?.appid)
  })).filter((x):x is {entry:unknown;id:number}=>
    x.id!==null&&actuallyRunning(x.entry));
  if(candidates.length===0)return null;
  const current=candidates.find(x=>x.id===preferred) ?? candidates[0];
  const title=name(current.entry)||fallbackName(current.id,appStore)||"Running game";
  return {id:current.id,title};
}

/** Foreground an EXISTING session. Never call RunGame, even for a shortcut.
 * Recheck membership immediately so a stale sidebar item cannot relaunch it.
 * The fallback route is only safe after Steam successfully selected the app. */
export function resumeRunningGame(
  target:RunningGame,
  steam:RunningSteamStore|null|undefined,
  navigateFallback?:()=>void,
):boolean {
  if(!steam)return false;
  let listed:unknown[];
  try{listed=list(steam.RunningApps);}
  catch{return false;}
  if(!listed.some(row=>appid(record(row)?.appid)===target.id&&actuallyRunning(row)))
    return false;
  if(typeof steam.SetRunningApp!=="function")return false;
  try{
    steam.SetRunningApp(target.id);
    if(typeof steam.NavigateToRunningApp==="function") {
      steam.NavigateToRunningApp(false);
      return true;
    }
    if(navigateFallback){navigateFallback();return true;}
  }catch(error) {
    console.warn("[game-library] unable to return to running Steam session",error);
  }
  // Keep a failed resume from invoking any launch method.
  return false;
}
