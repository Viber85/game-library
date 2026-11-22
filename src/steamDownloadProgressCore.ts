/** Steam's native download queue, with deliberately conservative fallback.
 * Downloads are always keyed by AppID and local client ID 0.
 */
export type TransferPhase="downloading"|"installing"|"verifying"|"updating"|"paused"|"queued"|"finalizing";
export type GameTransfer={phase:TransferPhase;percent:number|null};
export type NativeGameStatus={installed:boolean|null;displayStatus:number|null};
const PHASE_BY_STATUS:Record<number,TransferPhase>={
  3:"installing",5:"verifying",6:"updating",7:"downloading",
  18:"paused",19:"queued",22:"paused",23:"queued"
};
const record=(v:unknown):Record<string,unknown>|null=>
  v!==null&&typeof v==="object"?v as Record<string,unknown>:null;
const num=(v:unknown):number|null=>
  typeof v==="number"&&Number.isFinite(v)?v:null;
const pct=(v:unknown):number|null=>{
  const n=num(v);
  return n===null?null:Math.round(Math.min(100,Math.max(0,n)));
};
/** Percent from Steam's real byte counters (not an invented timer). */
function percentBytes(done:unknown,total:unknown):number|null{
  const d=num(done),t=num(total);
  return d!==null&&t!==null&&t>0?pct(100*d/t):null;
}
function percentProgressArray(raw:unknown):number|null{
  if(!Array.isArray(raw))return null;
  let done=0,total=0;
  for(const value of raw){
    const p=record(value),t=num(p?.bytes_total);
    if(t===null||t<=0)continue;
    total+=t;
    done+=Math.min(t,Math.max(0,num(p?.bytes_in_progress)??0));
  }
  return total>0?pct(done/total*100):null;
}

export function readNativeGameStatus(overview:unknown):NativeGameStatus{
  const app=record(overview);
  const local=record(app?.local_per_client_data) ??
    (Array.isArray(app?.per_client_data)?
      record(app.per_client_data.find(item=>String(record(item)?.clientid)==="0")):null);
  const data=local??app;
  return {
    installed:typeof data?.installed==="boolean"?data.installed:null,
    displayStatus:num(data?.display_status)
  };
}

/** Both SteamOS 3.8+ grouped local/remote and the older flat queue. */
export function readSteamDownloadItems(payload:unknown,appId:number):GameTransfer|null{
  if(!Array.isArray(payload))return null;
  const grouped=payload.some(x=>Array.isArray(record(x)?.item_data));
  const local=grouped?payload.filter(x=>
    String(record(x)?.remote_client_id??"0")==="0"
  ).flatMap(x=>{
    const data=record(x)?.item_data;
    return Array.isArray(data)?data:[];
  }):payload;
  let winner:GameTransfer|null=null,rank=-1;
  for(const raw of local){
    const item=record(raw);
    if(!item||Number(item.appid)!==appId||item.completed===true)continue;
    const active=item.active===true,paused=item.paused===true;
    const queued=(num(item.queue_index)??-1)>=0;
    if(!active&&!paused&&!queued)continue;
    const stages=Array.isArray(item.update_type_info)?
      item.update_type_info.map(record).filter((x):x is Record<string,unknown>=>x!==null&&x.has_update===true):[];
    const stage=stages.find(x=>x.completed_update!==true)??stages[stages.length-1];
    const percent=pct(stage?.overall_percent_complete) ??
      percentBytes(item.downloaded_bytes,item.total_bytes) ??
      percentBytes(stage?.downloaded_bytes,stage?.total_bytes) ??
      percentProgressArray(stage?.progress);
    const currentRank=active&&!paused?3:paused?2:1;
    if(currentRank>rank){
      rank=currentRank;
      winner={phase:paused?"paused":active?"downloading":"queued",percent};
    }
  }
  return winner;
}

/** Steam's active download overview may expose either a direct percentage or
 * a staged progress[] array rather than overall_percent_complete.
 */
export function readSteamDownloadOverview(raw:unknown,appId:number):GameTransfer|null{
  const o=record(raw);
  if(!o||Number(o.update_appid)!==appId||
    (o.remote_client_id!==undefined&&String(o.remote_client_id)!=="0"))return null;
  const state=o.update_state;
  if(typeof state!=="string"||!state||state==="None")return null;
  const phase:TransferPhase=o.paused===true?"paused":
    state==="Finalizing"?"finalizing":
    state==="Verifying"?"verifying":
    state==="Installing"?"installing":"downloading";
  return {phase,percent:pct(o.overall_percent_complete) ??
    percentProgressArray(o.progress) ??
    percentBytes(o.update_bytes_downloaded,o.update_bytes_to_download) ??
    percentBytes(o.update_bytes_processed,o.update_bytes_to_process)};
}

export function resolveGameTransfer(
  appId:number,items:unknown,downloadOverview:unknown,displayStatus:number|null
):GameTransfer|null{
  const fromItems=readSteamDownloadItems(items,appId);
  const fromOverview=readSteamDownloadOverview(downloadOverview,appId);
  // Download APIs override "ReadyToLaunch". Steam can mark installed early
  // while content is still queued/downloading. Version .34 did the reverse.
  if(fromOverview)return {phase:fromOverview.phase,
    percent:fromOverview.percent??fromItems?.percent??null};
  if(fromItems)return fromItems;
  const fallback=displayStatus===null?undefined:PHASE_BY_STATUS[displayStatus];
  return fallback?{phase:fallback,percent:null}:null;
}
export type PrimaryInstallMode="install"|"play"|"transfer"|"preparing";
export function resolveInstallMode(
  installed:boolean,status:number|null,transfer:GameTransfer|null,pending:boolean
):PrimaryInstallMode{
  if(transfer)return "transfer";
  if(pending)return "preparing";
  if(status===11)return "play";
  if(status===9||status===20||status===24||status===37||status===38)return "install";
  return installed?"play":"install";
}
export function transferLabel(d:GameTransfer):string{
  switch(d.phase){
    case "queued":return "Queued";
    case "paused":return "Paused";
    case "installing":return "Installing";
    case "verifying":return "Verifying";
    case "updating":return "Updating";
    case "finalizing":return "Finalizing";
    default:return "Downloading";
  }
}
