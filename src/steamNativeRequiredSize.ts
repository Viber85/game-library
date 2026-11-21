/** Native SteamOS disk-space requirement for a not-yet-installed Steam game.
 * Unlike Store minimum specifications, this is the client-reported required
 * installation space. It may be missing until Steam loads app details.
 */
export function requiredInstallBytes(value:unknown):number|null{
  if(!value||typeof value!=="object")return null;
  const fields=value as Record<string,unknown>;
  const raw=fields.lDiskSpaceRequiredBytes;
  const n=typeof raw==="number"?raw:
    typeof raw==="bigint"?Number(raw):
    typeof raw==="string"&&/^\d+$/.test(raw)?Number(raw):NaN;
  return Number.isSafeInteger(n)&&n>0&&n<=3_000_000_000_000?n:null;
}
export function readNativeRequiredInstallBytes(appId:number):number|null{
  if(!Number.isSafeInteger(appId)||appId<=0||appId>0xffffffff)return null;
  const host=window as unknown as Record<string,any>;
  try{
    const details=host.appDetailsStore?.GetAppDetails?.(appId);
    const overview=host.appStore?.GetAppOverviewByAppID?.(appId);
    return requiredInstallBytes(details)??requiredInstallBytes(overview);
  }catch{return null;}
}
const pendingDetails=new Map<number,Promise<number|null>>();
/** Request the same native Steam details that the standard game page loads.
 * Reading GetAppDetails without RequestAppDetails can return null indefinitely
 * for an uninstalled game that was never opened in Steam's detail view.
 * Requests are focus-driven and deduplicated by AppID.
 */
export function requestNativeRequiredInstallBytes(appId:number):Promise<number|null>{
  const current=readNativeRequiredInstallBytes(appId);
  if(current!==null)return Promise.resolve(current);
  if(!Number.isSafeInteger(appId)||appId<=0||appId>0xffffffff)
    return Promise.resolve(null);
  const existing=pendingDetails.get(appId);
  if(existing)return existing;
  const host=window as unknown as Record<string,any>;
  const store=host.appDetailsStore;
  if(typeof store?.RequestAppDetails!=="function")return Promise.resolve(null);
  const request=Promise.resolve()
    .then(()=>store.RequestAppDetails(appId))
    .then((value:unknown)=>requiredInstallBytes(value) ??
      readNativeRequiredInstallBytes(appId))
    .catch(()=>null)
    .finally(()=>pendingDetails.delete(appId));
  pendingDetails.set(appId,request);
  return request;
}
export function subscribeNativeRequiredInstallBytes(
  appId:number,
  update:(bytes:number)=>void,
):()=>void{
  if(!Number.isSafeInteger(appId)||appId<=0||appId>0xffffffff)return ()=>{};
  try{
    const apps=(window as unknown as Record<string,any>).SteamClient?.Apps;
    const registration=apps?.RegisterForAppDetails?.(appId,(details:unknown)=>{
      const size=requiredInstallBytes(details);
      if(size!==null)update(size);
    });
    return ()=>{try{registration?.unregister?.();}catch{/* Steam reset */}};
  }catch{return ()=>{};}
}
