/** Narrowly scoped workaround for Steam Game Mode virtual keyboard focus flicker.
 *
 * Steam's CGamepadBrowserView.OnVirtualKeyboardPress implementation currently
 * calls its native BrowserView.SetFocus(false) followed immediately by
 * SetFocus(true) for each character. GOG's login form validates on blur, so
 * this can mark the partially entered email as invalid after every letter.
 *
 * Instead of monkey-patching GOG's webpage, temporarily coalesce ONLY a
 * synchronous false -> true pair on the Steam-owned ExternalWeb view.
 * Genuine blur calls (no matching true in the same JS task) still reach Steam
 * on the very next microtask. Never log or inspect typed text/passwords.
 *
 * The native Steam bridge may reject replacing SetFocus. If so, fail safely
 * without altering anything; actual handheld testing is still required.
 */
export type FocusBridge={SetFocus?:(focused:boolean)=>void};
export type FocusGuard={installed:boolean;dispose:()=>void};

export function stabilizeGogKeyboardFocus(view:FocusBridge|null|undefined):FocusGuard{
  const noop=()=>{};
  if(!view||typeof view.SetFocus!=="function")
    return {installed:false,dispose:noop};

  const original=view.SetFocus;
  const hadOwn=Object.prototype.hasOwnProperty.call(view,"SetFocus");
  const originalDescriptor=Object.getOwnPropertyDescriptor(view,"SetFocus");
  let active=true;
  let pendingBlur=false;
  let blurTicket=0;

  const nativeFocus=(focused:boolean)=>{
    try{original.call(view,focused);}
    catch{/* Steam may have closed its ExternalWeb view. */}
  };
  const patched=(focused:boolean)=>{
    if(!active)return nativeFocus(focused);
    if(focused===false){
      const ticket=++blurTicket;
      pendingBlur=true;
      // Steam's per-letter false -> true sequence is synchronous. Delaying
      // only false prevents GOG from receiving a blur on every character.
      queueMicrotask(()=>{
        if(!active||!pendingBlur||ticket!==blurTicket)return;
        pendingBlur=false;
        nativeFocus(false);
      });
      return;
    }
    if(focused===true && pendingBlur){
      pendingBlur=false;
      blurTicket++;
    }
    nativeFocus(focused);
  };

  let installed=false;
  try{
    view.SetFocus=patched;
    installed=view.SetFocus===patched;
  }catch{/* Steam bridge can expose a nonwritable native method. */}

  if(!installed)return {installed:false,dispose:noop};
  return {
    installed:true,
    dispose:()=>{
      if(!active)return;
      active=false;
      // A real blur that was queued but never canceled must not be lost.
      if(pendingBlur){
        pendingBlur=false;
        blurTicket++;
        nativeFocus(false);
      }
      try{
        if(hadOwn && originalDescriptor){
          Object.defineProperty(view,"SetFocus",originalDescriptor);
        }else{
          delete view.SetFocus;
        }
      }catch{
        try{view.SetFocus=original;}catch{/* View was destroyed by Steam. */}
      }
    },
  };
}
