/** Game Library's own Steam BrowserView wrapper for GOG authorization.
 *
 * Opens GOG directly in an isolated native Steam browser popup. Its URL-change
 * events, not page contents, provide the one-use authorization code. This never
 * reads passwords, other plugins' data, cookies or Steam's unrelated browser tabs.
 *
 * BrowserView.CreatePopup is a Steam client capability and may be unavailable
 * on some SteamOS builds. Callers must keep a manual sign-in fallback.
 */
type NativeWebView={
  on:(event:string,handler:(...args:any[])=>void)=>void;
  off?:(event:string,handler:(...args:any[])=>void)=>void;
  SetFocus?:(value:boolean)=>void;
  SetVisible?:(value:boolean)=>void;
};
type NativeViewAPI={
  CreatePopup?:(opts:{strInitialURL:string;strName:string})=> {
    strCreateURL:string;browserView:NativeWebView;
  };
  Destroy?:(view:NativeWebView)=>void;
};
type NativeSteamWindow=Window&{SteamClient?:{BrowserView?:NativeViewAPI}};
export type GogLoginSession={cancel:()=>void};
export type GogLoginResult=
  |{ok:true;session:GogLoginSession}
  |{ok:false;reason:string};

/** Pure validator: callback must be GOG's exact HTTPS success path.
 * Code is never printed, copied to the clipboard or persisted in the UI.
 */
export function extractGogCallbackCode(value:string):string|null{
  if(typeof value!=="string"||value.length>2048)return null;
  try{
    const address=new URL(value);
    if(address.protocol!=="https:"||
        (address.hostname!=="embed.gog.com"&&address.hostname!=="www.gog.com")||
        address.pathname!=="/on_login_success"||
        address.username||address.password||address.port)return null;
    if(address.hostname==="embed.gog.com"&&address.searchParams.get("origin")!=="client")
      return null;
    const codes=address.searchParams.getAll("code");
    if(codes.length!==1)return null;
    return /^[A-Za-z0-9_-]{12,1024}$/.test(codes[0])?codes[0]:null;
  }catch{return null;}
}

/** Only GOG's own authorization entry point may be opened in this popup. */
export function isGogLoginURL(value:string):boolean{
  try{
    const address=new URL(value);
    return address.protocol==="https:"&&address.hostname==="auth.gog.com"&&
      address.pathname==="/auth"&&!address.username&&!address.password&&!address.port&&
      address.searchParams.get("response_type")==="code"&&
      address.searchParams.get("redirect_uri")==="https://embed.gog.com/on_login_success?origin=client";
  }catch{return false;}
}

export function startNativeGogLogin(
  authorizationURL:string,
  onAuthorized:(oneUseCode:string)=>void,
  onClose:(reason:"closed"|"timeout"|"error")=>void,
):GogLoginResult{
  if(!isGogLoginURL(authorizationURL))
    return {ok:false,reason:"GOG returned an invalid authorization URL."};
  const host=(window as NativeSteamWindow).SteamClient?.BrowserView;
  if(typeof host?.CreatePopup!=="function"||typeof host?.Destroy!=="function")
    return {ok:false,reason:"Steam native browser is not available on this build."};

  let view:NativeWebView|undefined;
  let popup:Window|null=null;
  let released=false;
  let timer:number|undefined;
  let closedCheck:number|undefined;
  const listeners:Array<[string,(...args:any[])=>void]> = [];

  const release=()=>{
    if(released)return;
    released=true;
    if(timer!==undefined)window.clearTimeout(timer);
    if(closedCheck!==undefined)window.clearInterval(closedCheck);
    if(view){
      for(const [name,callback] of listeners){
        try{view.off?.(name,callback);}catch{/* Some client versions lack off(). */}
      }
      try{view.SetFocus?.(false);}catch{/* Steam may already have closed it. */}
      try{view.SetVisible?.(false);}catch{/* Steam may already have closed it. */}
      try{host.Destroy?.(view);}catch{/* Never damage the Steam home view. */}
    }
    try{if(popup&&!popup.closed)popup.close();}catch{/* Native popup may already be gone. */}
  };
  const notifyClose=(reason:"closed"|"timeout"|"error")=>{
    if(released)return;
    release();
    onClose(reason);
  };
  const handleURL=(url:unknown)=>{
    if(released||typeof url!=="string")return;
    const code=extractGogCallbackCode(url);
    if(!code)return;
    release();  // Destroy OAuth browser before exchanging the code.
    onAuthorized(code);
  };
  const attach=(name:string,callback:(...args:any[])=>void)=>{
    view?.on(name,callback);
    listeners.push([name,callback]);
  };
  try{
    const result=host.CreatePopup({
      strInitialURL:authorizationURL,
      strName:"GameLibrary_GOG_SignIn",
    });
    if(!result?.browserView||!result.strCreateURL)
      throw new Error("Steam did not return a browser view.");
    view=result.browserView;
    attach("start-request",(url:unknown)=>handleURL(url));
    attach("start-loading",(url:unknown)=>handleURL(url));
    attach("finished-request",(url:unknown)=>handleURL(url));
    attach("history-changed",(history:unknown)=>{
      if(!history||typeof history!=="object")return;
      const data=history as {index?:number;entries?:Array<{url?:string}>};
      if(!Array.isArray(data.entries))return;
      // Only the active entry, not arbitrary old history pages.
      const entry=data.entries[data.index??data.entries.length-1];
      handleURL(entry?.url);
    });
    attach("before-close",()=>notifyClose("closed"));
    attach("load-error",(_code:unknown,failedURL:unknown)=>{
      // A redirect with a valid code is sufficient even if GOG's success
      // document fails to render in Steam's browser.
      handleURL(failedURL);
    });
    // Must be triggered synchronously by the user's Connect button, to avoid
    // Steam/CEF popup blockers. Never open the login link in a hidden iframe.
    popup=window.open(result.strCreateURL,"GameLibrary_GOG_SignIn",
      "popup=yes,width=1100,height=760");
    if(!popup)throw new Error("Steam blocked the sign-in window.");
    view.SetVisible?.(true);
    view.SetFocus?.(true);
    // Bound the lifetime of a potentially abandoned login popup.
    timer=window.setTimeout(()=>notifyClose("timeout"),10*60*1000);
    closedCheck=window.setInterval(()=>{
      try{if(popup?.closed)notifyClose("closed");}catch{/* Ignore inaccessible windows. */}
    },1500);
    return {ok:true,session:{cancel:release}};
  }catch{
    release();
    return {ok:false,reason:"Could not open Steam's GOG sign-in window."};
  }
}
