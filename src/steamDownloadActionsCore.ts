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

function boundedSteamReply(reply:unknown,timeoutMs:number):Promise<void>{
  // Keep a local, extension-free helper: these pure core tests run directly
  // under Node's native TypeScript loader, not Rollup's module resolver.
  let timer:ReturnType<typeof setTimeout>|undefined;
  const deadline=new Promise<void>((_,reject)=>{
    timer=setTimeout(()=>reject(new Error("Request timed out")),timeoutMs);
  });
  return Promise.race([Promise.resolve(reply).then(()=>undefined),deadline])
    .finally(()=>{if(timer!==undefined)clearTimeout(timer);});
}
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
    await boundedSteamReply(reply,timeoutMs);
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
     (action==="cancel"&&nature==="initial"&&
       typeof installs?.OpenUninstallWizard!=="function")||
     (action==="cancel"&&nature!=="initial"&&
       typeof downloads?.RemoveFromDownloadList!=="function"))
    return {ok:false,uninstallRequested:false,reason:"unavailable"};
  try{
    // Steam's native Library context-menu implementation shows its own
    // confirmation first and *then* calls OpenUninstallWizard([appId],true).
    // The caller has shown equivalent destructive confirmation already.
    // Calling false from a Decky route was opening no usable dialog.
    // Do not pause or remove the partial installation from queue first.
    if(action==="cancel"&&requestedUninstall){
      await invokeSteam("native confirmed uninstall",()=>
        installs!.OpenUninstallWizard!([appId],true),ackTimeoutMs);
    }else if(action==="cancel"){
      // Existing installed game or uncertain install: never uninstall
      // or touch its Proton prefix. Steam's Remove action just unschedules.
      await invokeSteam("remove download",()=>
        downloads!.RemoveFromDownloadList!(appId,LOCAL),ackTimeoutMs);
    }else{
      await invokeSteam(action,()=>downloads![method]!(appId,LOCAL),ackTimeoutMs);
    }
    return {ok:true,uninstallRequested:requestedUninstall};
  }catch(error){
    console.warn("[game-library] native Steam download action failed",error);
    return {ok:false,uninstallRequested:false,reason:"failed"};
  }
}
