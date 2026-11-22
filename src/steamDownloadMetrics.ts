/** Actual Steam download byte counts and estimated time for one local AppID.
 * Byte counts are transfer size, not the game's installed disk footprint.
 * Never infer ETA from percent, and never mix counters from two sources.
 */
export interface SteamDownloadMetrics {
  downloadedBytes:number|null;
  totalBytes:number|null;
  remainingSeconds:number|null;
}
export const EMPTY_DOWNLOAD_METRICS:SteamDownloadMetrics={
  downloadedBytes:null,totalBytes:null,remainingSeconds:null
};
type Data=Record<string,unknown>;
const obj=(v:unknown):Data|null=>
  v!==null&&typeof v==="object"?v as Data:null;
const nonnegative=(v:unknown):number|null=>{
  const n=typeof v==="number"?v:
    typeof v==="string"&&v.trim()!==""?Number(v):NaN;
  return Number.isFinite(n)&&n>=0?n:null;
};
function bytesPair(done:unknown,total:unknown):
  {downloadedBytes:number;totalBytes:number}|null {
  const d=nonnegative(done),t=nonnegative(total);
  if(d===null||t===null||t<=0)return null;
  return {downloadedBytes:Math.min(d,t),totalBytes:t};
}
function localQueue(payload:unknown):Data[]{
  if(!Array.isArray(payload))return [];
  const grouped=payload.some(x=>Array.isArray(obj(x)?.item_data));
  const source=grouped?payload.filter(x=>
    String(obj(x)?.remote_client_id??"0")==="0"
  ).flatMap(x=>{
    const entries=obj(x)?.item_data;
    return Array.isArray(entries)?entries:[];
  }):payload;
  return source.map(obj).filter((value):value is Data=>value!==null);
}
function eligible(row:Data,appId:number):boolean{
  const app=nonnegative(row.appid);
  if(app!==appId||row.completed===true)return false;
  return row.active===true||row.paused===true||
    (nonnegative(row.queue_index)??-1)>=0;
}
function mostRelevantItem(items:unknown,appId:number):Data|null{
  let best:Data|null=null,bestRank=-1;
  for(const item of localQueue(items)){
    if(!eligible(item,appId))continue;
    const rank=item.active===true&&!item.paused?3:item.paused===true?2:1;
    if(rank>bestRank){best=item;bestRank=rank;}
  }
  return best;
}
function itemBytes(item:Data|null){
  if(!item)return null;
  const own=bytesPair(item.downloaded_bytes,item.total_bytes);
  if(own)return own;
  if(!Array.isArray(item.update_type_info))return null;
  const stages=item.update_type_info.map(obj)
    .filter((x):x is Data=>x!==null&&x.has_update===true);
  const stage=stages.find(x=>x.completed_update!==true)??stages[stages.length-1];
  return stage?bytesPair(stage.downloaded_bytes,stage.total_bytes):null;
}
function activeOverview(raw:unknown,appId:number):Data|null{
  const o=obj(raw);
  if(!o||nonnegative(o.update_appid)!==appId||
    (o.remote_client_id!==undefined&&String(o.remote_client_id)!=="0")||
    typeof o.update_state!=="string"||o.update_state==="None"||o.update_state==="")
    return null;
  return o;
}
function overviewBytes(o:Data|null){
  if(!o)return null;
  return bytesPair(o.update_bytes_downloaded,o.update_bytes_to_download);
}
function appOverviewBytes(raw:unknown,appId:number){
  const app=obj(raw);
  if(app&&app.appid!==undefined&&nonnegative(app.appid)!==appId)return null;
  const local=obj(app?.local_per_client_data)??(
    Array.isArray(app?.per_client_data)?
      obj(app.per_client_data.find(v=>String(obj(v)?.clientid)==="0")):null
  );
  // Only treat the local app's per-client size as a network transfer total.
  return local?bytesPair(local.bytes_downloaded,local.bytes_total):null;
}
export function readSteamDownloadMetrics(
  appId:number,items:unknown,overview:unknown,appOverview?:unknown
):SteamDownloadMetrics {
  if(!Number.isSafeInteger(appId)||appId<=0)return {...EMPTY_DOWNLOAD_METRICS};
  const item=mostRelevantItem(items,appId);
  const live=activeOverview(overview,appId);
  // Active overview is the freshest live count. If it omits bytes, the
  // selected app's native queue counters are the next-best source.
  const bytes=overviewBytes(live)??itemBytes(item)??
    (item||live?appOverviewBytes(appOverview,appId):null);
  // Steam's Downloads page uses overall estimated completion time,
  // including staging and disk work. Older Steam builds expose only
  // update_seconds_remaining (network download phase).
  const positiveETA=(value:unknown):number|null=>{
    const seconds=nonnegative(value);
    return seconds!==null&&seconds>0?seconds:null;
  };
  const left=live&&live.paused!==true?(
    positiveETA(live.overall_estimated_time_remaining_sec) ??
    positiveETA(live.update_seconds_remaining)
  ):null;
  return {
    downloadedBytes:bytes?.downloadedBytes??null,
    totalBytes:bytes?.totalBytes??null,
    // -1, zero, infinity and missing mean Steam has no useful ETA.
    remainingSeconds:left!==null&&left>0?Math.round(left):null
  };
}
export function formatDownloadBytes(bytes:number|null):string{
  if(bytes===null||!Number.isFinite(bytes)||bytes<0)return "—";
  if(bytes>=1024**3)return (bytes/(1024**3)).toFixed(1)+" GB";
  if(bytes>=1024**2)return (bytes/(1024**2)).toFixed(1)+" MB";
  if(bytes>=1024)return (bytes/1024).toFixed(0)+" KB";
  return Math.round(bytes)+" B";
}
export function formatDownloadTime(seconds:number|null):string{
  if(seconds===null||!Number.isFinite(seconds)||seconds<=0)return "Estimating";
  if(seconds<60)return "<1 min";
  const min=Math.ceil(seconds/60);
  if(min<60)return min+" min";
  const hours=Math.floor(min/60),minutes=min%60;
  return minutes?hours+" h "+minutes+" min":hours+" h";
}
