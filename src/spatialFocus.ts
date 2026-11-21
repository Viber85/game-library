/** Directional focus for custom Game Library menus.
 * Uses the actual on-screen rectangles of controls; no reliance on Decky's
 * inferred focus links across flex-wrap, grids or nested editor regions.
 */
export type FocusDirection="left"|"right"|"up"|"down";
export type FocusBounds={left:number;right:number;top:number;bottom:number};

export function directionalNeighbor(
  rects:readonly FocusBounds[],
  current:number,
  direction:FocusDirection,
):number|null{
  const from=rects[current];
  if(!from)return null;
  const horizontal=direction==="left"||direction==="right";
  const sign=direction==="right"||direction==="down"?1:-1;
  const center=(rect:FocusBounds)=>({
    x:(rect.left+rect.right)/2,
    y:(rect.top+rect.bottom)/2,
  });
  const origin=center(from);
  const fromSize=horizontal?from.bottom-from.top:from.right-from.left;
  let best:number|null=null;
  let score=Infinity;
  for(let i=0;i<rects.length;i++){
    if(i===current)continue;
    const rect=rects[i];
    const at=center(rect);
    const primary=horizontal?(at.x-origin.x)*sign:(at.y-origin.y)*sign;
    if(primary<=3)continue;
    const cross=horizontal?Math.abs(at.y-origin.y):Math.abs(at.x-origin.x);
    const otherSize=horizontal?rect.bottom-rect.top:rect.right-rect.left;
    // Sideways moves must remain on the same visual row; a button one
    // row below is reached with DOWN, not with RIGHT.
    if(horizontal&&cross>Math.max(16,(fromSize+otherSize)*.36))continue;
    // Prefer the closest row/column; then the closest control on it.
    const cost=primary+cross*(horizontal?.45:.35);
    if(cost<score){score=cost;best=i;}
  }
  return best;
}

export function focusSpatially(
  region:HTMLElement|null,
  current:HTMLElement|null,
  direction:FocusDirection,
  selector:string,
):boolean{
  if(!region||!current)return false;
  const nodes=[...region.querySelectorAll<HTMLElement>(selector)].filter(el=>
    !!el.getClientRects().length &&
    !el.closest("[hidden],[aria-hidden='true']") &&
    !el.hasAttribute("disabled") &&
    el.getAttribute("aria-disabled")!=="true");
  const from=nodes.findIndex(el=>el===current||el.contains(current));
  if(from<0)return false;
  const next=directionalNeighbor(nodes.map(el=>el.getBoundingClientRect()),from,direction);
  if(next===null)return false;
  const node=nodes[next];
  node.focus();
  node.scrollIntoView({block:"nearest",inline:"nearest"});
  return true;
}
