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
export async function nativeDownloadAction(
  action:SteamDownloadAction,appId:number,nonSteam:boolean,
  nature:SteamDownloadNature,downloads:NativeDownloadClient|null|undefined,
  installs?:NativeUninstallClient|null
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
      // Pausing an already queued/paused app throws on some Steam versions.
      // The authoritative cancellation is RemoveFromDownloadList, so a
      // best-effort Pause must not block the removal and Steam uninstall.
      if(typeof downloads?.PauseAppUpdate==="function"){
        try{await Promise.resolve(downloads.PauseAppUpdate(appId,LOCAL));}
        catch(error){console.warn("[game-library] pause before cancel unavailable",error);}
      }
      await Promise.resolve(downloads!.RemoveFromDownloadList!(appId,LOCAL));
      if(requestedUninstall)
        await Promise.resolve(installs!.OpenUninstallWizard!([appId],true));
    }else{
      await Promise.resolve(downloads![method]!(appId,LOCAL));
    }
    return {ok:true,uninstallRequested:requestedUninstall};
  }catch(error){
    console.warn("[game-library] native Steam download action failed",error);
    return {ok:false,uninstallRequested:false,reason:"failed"};
  }
}
