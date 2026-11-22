import {withRequestTimeout} from "./requestDeadline";

/** App-scoped native Steam transfer controls. No global pause/resume.
 * Only a provably new install can trigger Steam's native uninstall cleanup.
 */
export type SteamDownloadNature="initial"|"update"|"unknown";
export type SteamDownloadAction="pause"|"resume"|"cancel";
export type NativeDownloadClient={
  PauseAppUpdate?:(appId:number,clientId?:string)=>unknown;
  ResumeAppUpdate?:(appId:number,clientId?:string)=>unknown;
  RemoveFromDownloadList?:(appId:number,clientId?:string)=>unknown;
};
export type NativeUninstallClient={
  OpenUninstallWizard?:(appIds:number[],dontPrompt:boolean)=>unknown;
};
export type ActionResult={
  ok:boolean;uninstallRequested:boolean;reason?:"invalid-app"|"unavailable"|"failed";
};
const data=(v:unknown):Record<string,unknown>|null=>
  v!==null&&typeof v==="object"?v as Record<string,unknown>:null;
const valid=(appId:number,nonSteam:boolean)=>
  !nonSteam&&Number.isSafeInteger(appId)&&appId>0&&appId<0x80000000;
export function readSteamDownloadNature(appId:number,items:unknown,overview:unknown):
  SteamDownloadNature{
  const o=data(overview);
  if(o&&Number(o.update_appid)===appId&&
     typeof o.update_state==="string"&&o.update_state!=="None"&&
     typeof o.update_is_install==="boolean")
    return o.update_is_install?"initial":"update";
  if(!Array.isArray(items))return "unknown";
  const grouped=items.some(x=>Array.isArray(data(x)?.item_data));
  const rows=grouped?items.filter(x=>String(data(x)?.remote_client_id??"0")==="0")
    .flatMap(x=>Array.isArray(data(x)?.item_data)?data(x)!.item_data as unknown[]:[]):items;
  for(const raw of rows){
    const item=data(raw);
    if(!item||Number(item.appid)!==appId||item.completed===true)continue;
    if(item.active!==true&&item.paused!==true&&
      !(typeof item.queue_index==="number"&&item.queue_index>=0))continue;
    if(typeof item.buildid==="number"&&Number.isFinite(item.buildid))
      return item.buildid===0?"initial":"update";
  }
  return "unknown";
}
const LOCAL="0";
const DEFAULT_NATIVE_ACK_MS=2500;
/** Steam's UI command methods are documented as void, yet some client builds
 * return thenables that never settle. Dispatch them, but do not wait forever.
 * A timeout means the command was SENT, not that Steam confirmed completion.
 */
async function invokeSteam(
  name:string,request:()=>unknown,timeoutMs:number
):Promise<void>{
  const reply=request();
  if(reply===null||reply===undefined)return;
  try{
    await withRequestTimeout(Promise.resolve(reply),timeoutMs);
  }catch(error){
    if(error instanceof Error&&error.message==="Request timed out"){
      console.warn("[game-library] Steam "+name+" response is pending; checking Steam state");
      return;
    }
    throw error;
  }
}
export async function nativeDownloadAction(
  action:SteamDownloadAction,appId:number,nonSteam:boolean,
  nature:SteamDownloadNature,downloads:NativeDownloadClient|null|undefined,
  installs?:NativeUninstallClient|null,ackTimeoutMs=DEFAULT_NATIVE_ACK_MS
):Promise<ActionResult>{
  if(!valid(appId,nonSteam))return {ok:false,uninstallRequested:false,reason:"invalid-app"};
  const requestedUninstall=action==="cancel"&&nature==="initial";
  const method=action==="resume"?"ResumeAppUpdate":"PauseAppUpdate";
  if((action!=="cancel"&&typeof downloads?.[method]!=="function")||
     (action==="cancel"&&typeof downloads?.RemoveFromDownloadList!=="function")||
     (requestedUninstall&&typeof installs?.OpenUninstallWizard!=="function"))
    return {ok:false,uninstallRequested:false,reason:"unavailable"};
  try{
    // Some SteamOS versions include the explicit local-client second argument.
    // Do not touch other apps or call EnableAllDownloads (global).
    if(action==="cancel"){
      // Pausing an already queued/paused app can reject or hang; this is
      // best-effort, but must never block queue removal indefinitely.
      if(typeof downloads?.PauseAppUpdate==="function"){
        try{
          await invokeSteam("pause before cancel",()=>
            downloads.PauseAppUpdate!(appId,LOCAL),ackTimeoutMs);
        }catch(error){
          console.warn("[game-library] pause before cancel unavailable",error);
        }
      }
      // RemoveFromDownloadList alone just unschedules a partial install.
      await invokeSteam("remove download",()=>
        downloads!.RemoveFromDownloadList!(appId,LOCAL),ackTimeoutMs);
      if(requestedUninstall){
        await invokeSteam("uninstall partial game",()=>
          installs!.OpenUninstallWizard!([appId],true),ackTimeoutMs);
      }
    }else{
      await invokeSteam(action,()=>downloads![method]!(appId,LOCAL),ackTimeoutMs);
    }
    return {ok:true,uninstallRequested:requestedUninstall};
  }catch(error){
    console.warn("[game-library] native Steam download action failed",error);
    return {ok:false,uninstallRequested:false,reason:"failed"};
  }
}
