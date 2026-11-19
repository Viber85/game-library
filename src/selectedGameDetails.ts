/**
 * Steam's hero and title-logo components mount for the same focused game.
 * Both previously requested identical native app details independently.
 * Coalesce only overlapping requests: do not permanently cache the Promise,
 * because Steam artwork can legitimately change during a running session.
 */
const pending=new Map<number,Promise<boolean>>();

export function requestSelectedGameDetails(appid:number):Promise<boolean>{
  if(!Number.isSafeInteger(appid)||appid<=0||appid>0xffffffff)
    return Promise.resolve(false);
  const existing=pending.get(appid);
  if(existing)return existing;
  const store=(window as any).appDetailsStore;
  if(typeof store?.RequestAppDetails!=="function")
    return Promise.resolve(false);
  const request:Promise<boolean>=Promise.resolve()
    .then(()=>store.RequestAppDetails(appid))
    .then(()=>true,()=>false);
  pending.set(appid,request);
  void request.then(()=>{
    if(pending.get(appid)===request)pending.delete(appid);
  });
  return request;
}
