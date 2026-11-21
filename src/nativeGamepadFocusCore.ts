import {directionalNeighbor,type FocusDirection} from "./spatialFocus.ts";

export type SteamFocusNode={
  Element?:HTMLElement|null;
  GetChildren?:()=>[SteamFocusNode[],number];
  BTakeFocus?:(source:number,direction:number)=>boolean;
};
export type SteamFocusTree={Root?:SteamFocusNode|null; m_ID?:string};

export function matchingGamepadControls(
  container:HTMLElement,
  selector:string,
):HTMLElement[]{
  return [...container.querySelectorAll<HTMLElement>(selector)].filter(element=>
    element.getClientRects().length>0 &&
    element.getAttribute("aria-disabled")!=="true" &&
    !element.hasAttribute("disabled") &&
    !element.closest("[hidden],[aria-hidden='true']"));
}

export function nextGamepadControl(
  container:HTMLElement,
  source:HTMLElement,
  direction:FocusDirection,
  selector:string,
):HTMLElement|null{
  const controls=matchingGamepadControls(container,selector);
  const current=controls.findIndex(el=>el===source||el.contains(source));
  if(current<0)return null;
  const next=directionalNeighbor(controls.map(el=>el.getBoundingClientRect()),current,direction);
  return next===null?null:controls[next];
}

/** Take focus through Steam's navigation tree instead of HTMLElement.focus().
 * Native BTakeFocus moves the actual Game Mode gamepad focus/highlight;
 * browser focus alone is insufficient for controller navigation. */
export function takeNativeGamepadFocus(
  trees:readonly SteamFocusTree[],
  target:HTMLElement,
  directionButton:number,
):boolean{
  let candidate:SteamFocusNode|null=null;
  let score=Infinity;
  // Only inspect the navigation tree for the document owning our UI.
  for(const tree of trees){
    if(!tree.Root?.Element||tree.Root.Element.ownerDocument!==target.ownerDocument)continue;
    const stack:SteamFocusNode[]=[tree.Root];
    let examined=0;
    while(stack.length&&examined++<6000){
      const node=stack.pop()!;
      const el=node.Element;
      if(el&&typeof node.BTakeFocus==="function"){
        let currentScore=Infinity;
        if(el===target)currentScore=0;
        else if(target.contains(el))currentScore=1;
        else if(el.contains(target)){
          // A Steam nav wrapper around a button may be one element above it.
          const distance=(target.getBoundingClientRect().width*
            target.getBoundingClientRect().height)/
            Math.max(1,el.getBoundingClientRect().width*
              el.getBoundingClientRect().height);
          if(distance>.6)currentScore=2;
        }
        if(currentScore<score){score=currentScore;candidate=node;}
      }
      try{
        const kids=node.GetChildren?.()?.[0];
        if(Array.isArray(kids))stack.push(...kids);
      }catch{/* One broken subtree must not prevent other trees. */}
    }
    if(score===0)break;
  }
  try{return candidate?.BTakeFocus?.(0,directionButton)===true;}catch{return false;}
}
