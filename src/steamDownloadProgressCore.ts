/** Read-only Steam download state. GamepadUI owns all install work.
 * SteamOS 3.8+ groups items by remote client; older clients send flat items.
 * Never mix another PC's downloads with the local install state.
 */
export type TransferPhase="downloading"|"installing"|"verifying"|"updating"|"paused"|"queued"|"finalizing";
export type GameTransfer={phase:TransferPhase;percent:number|null};
export type NativeGameStatus={installed:boolean|null;displayStatus:number|null};

const PHASE_BY_STATUS:Record<number,TransferPhase>={
  3:"installing",5:"verifying",6:"updating",7:"downloading",
  18:"paused",19:"queued",22:"paused",23:"queued"
};
const num=(value:unknown):number|null=>
  typeof value==="number"&&Number.isFinite(value)?value:null;
const record=(value:unknown):Record<string,unknown>|null=>
  value!==null&&typeof value==="object"?value as Record<string,unknown>:null;
const percent=(value:unknown):number|null=>{
  const n=num(value);
  return n===null?null:Math.round(Math.min(100,Math.max(0,n)));
};

export function readNativeGameStatus(overview:unknown):NativeGameStatus{
  const app=record(overview);
  const local=record(app?.local_per_client_data) ??
    (Array.isArray(app?.per_client_data)?
      record(app.per_client_data.find(item=>String(record(item)?.clientid)==="0")):null);
  const data=local??app;
  const installed=typeof data?.installed==="boolean"?data.installed:null;
  const displayStatus=num(data?.display_status);
  return {installed,displayStatus};
}

/** Extract a specific game's pending queue item. Completed, unscheduled
 * and other-device items are not ongoing transfers.
 */
export function readSteamDownloadItems(payload:unknown,appId:number):GameTransfer|null{
  if(!Array.isArray(payload))return null;
  const groups=payload.some(row=>Array.isArray(record(row)?.item_data));
  const local=groups?payload.filter(row=>{
    const item=record(row);
    return String(item?.remote_client_id??"0")==="0";
  }).flatMap(row=>record(row)?.item_data as unknown[]??[]):payload;
  let best:GameTransfer|null=null;
  let priority=-1;
  for(const raw of local){
    const item=record(raw);
    if(!item||num(item.appid)!==appId||item.completed===true)continue;
    const active=item.active===true;
    const paused=item.paused===true;
    const queued=(num(item.queue_index)??-1)>=0;
    if(!active&&!paused&&!queued)continue;
    const phase:TransferPhase=paused?"paused":active?"downloading":"queued";
    let progress:number|null=null;
    if(Array.isArray(item.update_type_info)){
      const updates=item.update_type_info.map(record).filter((x):x is Record<string,unknown>=>x!==null&&x.has_update===true);
      const stage=updates.find(x=>x.completed_update!==true)??updates[updates.length-1];
      progress=percent(stage?.overall_percent_complete);
    }
    if(progress===null){
      const completed=num(item.downloaded_bytes),total=num(item.total_bytes);
      if(completed!==null&&total!==null&&total>0)
        progress=percent(100*completed/total);
    }
    const rank=active&&!paused?3:paused?2:1;
    if(rank>priority){best={phase,percent:progress};priority=rank;}
  }
  return best;
}

/** The overview gives live progress for the currently active AppID only.
 * Keep progress null if Steam does not provide it: never invent percentages.
 */
export function readSteamDownloadOverview(raw:unknown,appId:number):GameTransfer|null{
  const overview=record(raw);
  if(!overview||num(overview.update_appid)!==appId||
     (overview.remote_client_id!==undefined&&String(overview.remote_client_id)!=="0"))
    return null;
  const state=overview.update_state;
  if(typeof state!=="string"||state==="None"||state==="")return null;
  const phase:TransferPhase=overview.paused===true?"paused":
    state==="Finalizing"?"finalizing":state==="Verifying"?"verifying":
    state==="Installing"?"installing":"downloading";
  return {phase,percent:percent(overview.overall_percent_complete)};
}

export function resolveGameTransfer(
  appId:number,items:unknown,downloadOverview:unknown,displayStatus:number|null
):GameTransfer|null{
  // ReadyToLaunch wins over stale download callbacks after installation.
  if(displayStatus===11)return null;
  const fromItems=readSteamDownloadItems(items,appId);
  const live=readSteamDownloadOverview(downloadOverview,appId);
  if(live)return {phase:live.phase,percent:live.percent??fromItems?.percent??null};
  if(fromItems)return fromItems;
  const fallback=displayStatus!==null?PHASE_BY_STATUS[displayStatus]:undefined;
  return fallback?{phase:fallback,percent:null}:null;
}

export type PrimaryInstallMode="install"|"play"|"transfer"|"preparing";
export function resolveInstallMode(
  installed:boolean,status:number|null,transfer:GameTransfer|null,pending:boolean
):PrimaryInstallMode{
  if(transfer)return "transfer";
  if(status===11)return "play";
  if(pending)return "preparing";
  if(status===9||status===24||status===20||status===37||status===38)return "install";
  return installed?"play":"install";
}

export function transferLabel(transfer:GameTransfer):string{
  switch(transfer.phase){
    case "queued":return "Queued";
    case "paused":return "Paused";
    case "installing":return "Installing";
    case "verifying":return "Verifying";
    case "updating":return "Updating";
    case "finalizing":return "Finalizing";
    default:return "Downloading";
  }
}
