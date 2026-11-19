/** Share only pending metadata RPCs; Python remains the authoritative TTL cache.
 * Keyed by provider, app ID, exact title and Steam/non-Steam flag.
 */
export function createInflightGate(){
  const pending=new Map<string,Promise<unknown>>();
  return function shared<T>(parts:readonly (string|number|boolean)[],run:()=>Promise<T>):Promise<T>{
    const key=JSON.stringify(parts);
    const existing=pending.get(key) as Promise<T>|undefined;
    if(existing)return existing;
    const request=Promise.resolve().then(run);
    pending.set(key,request);
    const release=()=>{if(pending.get(key)===request)pending.delete(key);};
    void request.then(release,release);
    return request;
  };
}
