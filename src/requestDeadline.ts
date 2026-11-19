/**
 * Cancel the deadline timer as soon as an update-check RPC settles.
 * Without the cleanup each successful GitHub request retains its timer
 * and timeout closure for another 12 seconds in the long-lived Decky UI.
 * The existing timeout error and default duration are unchanged.
 */
export function withRequestTimeout<T>(
  request:Promise<T>,timeoutMs=12000
):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const deadline=new Promise<T>((_,reject)=>{
    timer=setTimeout(()=>reject(new Error("Request timed out")),timeoutMs);
  });
  return Promise.race([request,deadline]).finally(()=>{
    if(timer!==undefined)clearTimeout(timer);
  });
}
