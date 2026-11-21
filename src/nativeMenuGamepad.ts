import {useEffect,type RefObject} from "react";
import {GamepadButton,getGamepadNavigationTrees} from "@decky/ui";
import {nextGamepadControl,takeNativeGamepadFocus,
  type SteamFocusTree} from "./nativeGamepadFocusCore";
import type {FocusDirection} from "./spatialFocus";

type DirectionEvent=CustomEvent<{button?:number}>;
type MenuType="tabs"|"settings"|"appearance"|"collections"|"diagnostics";

const CONTROLS:Record<MenuType,string>={
  tabs:[
    ".gl-tab-manager-row",".gl-tab-manager-action",
    ".gl-tab-picker-game",".gl-tab-smart-choice",
    ".gl-tab-smart-rule-picker",".gl-tab-smart-option",
    ".gl-tab-manager-create input",".gl-tab-picker-search input",
  ].join(","),
  settings:[
    ".gl-plugin-setting-row",".gl-tab-manager-action",
    ".gl-plugin-settings-tool-content button",
    ".gl-plugin-settings-tool-content [role='button']",
    ".gl-plugin-settings-tool-content input",
  ].join(","),
  appearance:[
    ".gl-appearance-card:not(.gl-theme-hub-planned) .gl-appearance-card-heading",
    ".gl-appearance-theme-option",
  ].join(","),
  collections:[
    ".gl-collections-card",".gl-grid-back",".gl-collections-group",
    ".gl-collections-add",".gl-collections-picker-row",
    ".gl-collections-grid .gl-game",
    ".gl-collections-picker-search input",
  ].join(","),
  diagnostics:".ld-button",
};

export function directionFromButton(button:number|undefined):FocusDirection|null{
  switch(button){
    case GamepadButton.DIR_LEFT:return "left";
    case GamepadButton.DIR_RIGHT:return "right";
    case GamepadButton.DIR_UP:return "up";
    case GamepadButton.DIR_DOWN:return "down";
    default:return null;
  }
}

export function nativeMenuTarget(
  scope:HTMLElement,
  source:HTMLElement,
  direction:FocusDirection,
  kind:MenuType,
):HTMLElement|null{
  const selector=CONTROLS[kind];
  // A list item always enters the editor on Right, regardless of its
  // vertical position (the selected item can be near the bottom).
  if(kind==="tabs"){
    const list=source.closest(".gl-tab-manager-row");
    if(list&&direction==="right")
      return scope.querySelector<HTMLElement>(".gl-tab-manager-editor .gl-tab-manager-action");
    if(source.closest(".gl-tab-manager-editor")&&direction==="left"){
      const native=nextGamepadControl(scope,source,direction,selector);
      if(native&&native.closest(".gl-tab-manager-editor"))return native;
      return scope.querySelector<HTMLElement>(
        ".gl-tab-manager-row.gl-tab-manager-selected");
    }
  }
  return nextGamepadControl(scope,source,direction,selector);
}

/** SteamOS controller focus is not the DOM's document.activeElement.
 * Intercept Steam's native direction event in capture phase and ask its
 * navigation tree to focus the actual next Game Mode control. */
export function handleNativeMenuDirection(
  event:DirectionEvent,
  scope:HTMLElement,
  kind:MenuType,
  trees:readonly SteamFocusTree[],
):boolean{
  const direction=directionFromButton(event.detail?.button);
  if(!direction)return false;
  const target=event.target;
  if(!(target instanceof Element))return false;
  const consume=()=>{
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
  // The left rail is outside .gl-main. Transfer *Steam* focus into the
  // actual menu, not just document.activeElement.
  if(!scope.contains(target)){
    if(kind==="diagnostics"||direction!=="right"||
      !target.closest(".gl-sidebar .gl-rail-item"))return false;
    const entry=scope.querySelector<HTMLElement>(CONTROLS[kind]);
    if(!entry||!takeNativeGamepadFocus(trees,entry,event.detail!.button!))return false;
    consume();
    return true;
  }
  if(target.closest(".gl-sidebar"))return false;
  const source=target.closest<HTMLElement>(CONTROLS[kind]);
  if(!source)return false;
  // Keyboard caret positioning is different from Game Mode focus traversal.
  if(source instanceof HTMLInputElement&&
    (direction==="left"||direction==="right"))return false;
  const next=nativeMenuTarget(scope,source,direction,kind);
  if(!next&&direction==="left"&&kind!=="diagnostics"){
    const rail=scope.parentElement?.querySelector<HTMLElement>(
      ".gl-sidebar .gl-rail-item.gl-rail-current");
    if(rail&&takeNativeGamepadFocus(trees,rail,event.detail!.button!)){
      consume();return true;
    }
  }
  if(!next)return false;
  if(!takeNativeGamepadFocus(trees,next,event.detail!.button!))return false;
  next.scrollIntoView({block:"nearest",inline:"nearest"});
  consume();
  return true;
}

export function useNativeMenuGamepad(
  kind:MenuType|null,
  root:RefObject<HTMLElement|null>,
):void{
  useEffect(()=>{
    if(!kind||!root.current)return;
    const host=root.current;
    const doc=host.ownerDocument;
    const onDirection=(event:Event)=>{
      const scope=kind==="diagnostics"?host:
        host.querySelector<HTMLElement>(".gl-main");
      if(!scope)return;
      let trees:SteamFocusTree[]=[];
      try{
        const result=getGamepadNavigationTrees() as unknown;
        if(Array.isArray(result))trees=result as SteamFocusTree[];
      }catch{/* Preserve native navigation if Steam exposes no trees. */}
      handleNativeMenuDirection(event as DirectionEvent,scope,kind,trees);
    };
    doc.body.addEventListener("vgp_ondirection",onDirection,true);
    return ()=>doc.body.removeEventListener("vgp_ondirection",onDirection,true);
  },[kind,root]);
}
