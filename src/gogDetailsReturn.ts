/** GOG Game Details currently lives in Dashboard React state, unlike the
 * dedicated Steam Game Details route. A native browser/controller page can
 * unmount Dashboard; keep a short-lived provider-keyed one-shot return state.
 * Do not confuse numeric GOG ProductIDs with Steam AppIDs.
 */
type GogDetailsReturn={
  route:string;productId:string;index:number;at:number;
};
const VALID_ROUTES=new Set([
  "/library/home","/game-library/dashboard","/game-library/library",
  "/game-library/search","/game-library/collections"
]);
const MAX_AGE_MS=10*60*1000;
let pending:GogDetailsReturn|null=null;
export function armGogDetailsReturn(
  route:string,productId:string,index:number,now=Date.now()
):boolean{
  if(!VALID_ROUTES.has(route)||!/^[0-9]{1,20}$/.test(productId)||
     !Number.isInteger(index)||index<0||!Number.isFinite(now))return false;
  pending={route,productId,index,at:now};
  return true;
}
export function consumeGogDetailsReturn(route:string,now=Date.now()):{
  productId:string;index:number
}|null{
  if(!pending)return null;
  if(now<pending.at||now-pending.at>MAX_AGE_MS){pending=null;return null;}
  if(pending.route!==route)return null;
  const {productId,index}=pending;
  pending=null;
  return {productId,index};
}
export function clearGogDetailsReturn():void{pending=null;}
