/** Cross-route notification for the existing Steam Home replacement switch. */
const listeners=new Set<(enabled:boolean)=>void>();
export function notifyHomeSetting(enabled:boolean):void{
  for(const listener of [...listeners])listener(enabled);
}
export function subscribeHomeSetting(listener:(enabled:boolean)=>void):()=>void{
  listeners.add(listener);
  return ()=>{listeners.delete(listener);};
}
